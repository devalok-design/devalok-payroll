import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/rbac'

interface PaymentUpdate {
  paymentId: string
  leaveCashoutDays: number
  debtPayoutAmount: number
}

// PATCH /api/payroll/[id]/payments - Update individual payment adjustments on a PENDING payroll
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  const rbacError = requireAdmin(session)
  if (rbacError) return rbacError

  const { id } = params

  try {
    const body = await request.json()
    const { payments: updates } = body as { payments: PaymentUpdate[] }

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'payments array required' },
        { status: 400 }
      )
    }

    // Fetch the payroll run
    const payrollRun = await prisma.payrollRun.findUnique({
      where: { id },
    })

    if (!payrollRun) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
    }

    if (payrollRun.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only edit payments on PENDING payroll runs' },
        { status: 400 }
      )
    }

    // Get cycleDays from schedule
    const schedule = await prisma.payrollSchedule.findFirst({
      where: { isActive: true },
      select: { cycleDays: true },
    })
    const cycleDays = schedule?.cycleDays || 14

    // Fetch existing payments with lokwasi data
    const existingPayments = await prisma.payment.findMany({
      where: { payrollRunId: id },
      include: {
        lokwasi: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            bankName: true,
            isAxisBank: true,
            leaveBalance: true,
            salaryDebtBalance: true,
            accountBalance: true,
          },
        },
      },
    })

    // Build a map for quick lookup
    const paymentMap = new Map(existingPayments.map((p) => [p.id, p]))

    // Validate all updates
    for (const update of updates) {
      const payment = paymentMap.get(update.paymentId)
      if (!payment) {
        return NextResponse.json(
          { error: `Payment ${update.paymentId} not found in this payroll run` },
          { status: 400 }
        )
      }

      if (update.leaveCashoutDays > 0 && update.leaveCashoutDays > Number(payment.lokwasi.leaveBalance)) {
        return NextResponse.json(
          {
            error: `Insufficient leave balance for ${payment.lokwasi.name}. ` +
                   `Requested: ${update.leaveCashoutDays} days, Available: ${Number(payment.lokwasi.leaveBalance)} days`
          },
          { status: 400 }
        )
      }

      if (update.debtPayoutAmount > 0 && update.debtPayoutAmount > Number(payment.lokwasi.salaryDebtBalance)) {
        return NextResponse.json(
          {
            error: `Insufficient debt balance for ${payment.lokwasi.name}. ` +
                   `Requested: ₹${update.debtPayoutAmount}, Available: ₹${Number(payment.lokwasi.salaryDebtBalance)}`
          },
          { status: 400 }
        )
      }
    }

    // Update all payments in a transaction
    const result = await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        const payment = paymentMap.get(update.paymentId)!
        const grossSalary = Number(payment.grossAmount)
        const tdsRate = Number(payment.tdsRate)
        const accountBalance = Number(payment.lokwasi.accountBalance)

        // Recalculate
        const dailyRate = grossSalary / cycleDays
        const leaveCashoutAmount = Math.round(dailyRate * update.leaveCashoutDays * 100) / 100
        const taxableAmount = grossSalary + leaveCashoutAmount + update.debtPayoutAmount
        const tdsAmount = Math.ceil(taxableAmount * tdsRate / 100)
        const netBeforeRecovery = taxableAmount - tdsAmount

        let accountDebitAmount = 0
        if (accountBalance < 0) {
          const amountOwed = Math.abs(accountBalance)
          accountDebitAmount = Math.min(amountOwed, netBeforeRecovery)
        }

        const netAmount = netBeforeRecovery - accountDebitAmount

        await tx.payment.update({
          where: { id: update.paymentId },
          data: {
            leaveCashoutDays: update.leaveCashoutDays,
            leaveCashoutAmount,
            debtPayoutAmount: update.debtPayoutAmount,
            tdsAmount,
            accountDebitAmount,
            netAmount,
          },
        })
      }

      // Recalculate payroll run totals
      const allPayments = await tx.payment.findMany({
        where: { payrollRunId: id },
      })

      const totals = allPayments.reduce(
        (acc, p) => ({
          totalGross: acc.totalGross + Number(p.grossAmount) + Number(p.leaveCashoutAmount),
          totalTds: acc.totalTds + Number(p.tdsAmount),
          totalNet: acc.totalNet + Number(p.netAmount),
          totalDebtPayout: acc.totalDebtPayout + Number(p.debtPayoutAmount),
          totalLeaveCashout: acc.totalLeaveCashout + Number(p.leaveCashoutAmount),
        }),
        { totalGross: 0, totalTds: 0, totalNet: 0, totalDebtPayout: 0, totalLeaveCashout: 0 }
      )

      const updatedRun = await tx.payrollRun.update({
        where: { id },
        data: {
          totalGross: totals.totalGross,
          totalTds: totals.totalTds,
          totalNet: totals.totalNet,
          totalDebtPayout: totals.totalDebtPayout,
          totalLeaveCashout: totals.totalLeaveCashout,
        },
        include: {
          payments: {
            include: {
              lokwasi: {
                select: {
                  id: true,
                  name: true,
                  employeeCode: true,
                  bankName: true,
                  isAxisBank: true,
                  leaveBalance: true,
                  salaryDebtBalance: true,
                  accountBalance: true,
                },
              },
            },
          },
        },
      })

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: session!.user.id,
          action: 'UPDATE_PAYROLL_PAYMENTS',
          entityType: 'payroll_run',
          entityId: id,
          newValues: {
            updatedPayments: updates.length,
            totalNet: totals.totalNet,
          },
        },
      })

      return updatedRun
    })

    // Transform response
    const transformedRun = {
      ...result,
      totalGross: Number(result.totalGross),
      totalTds: Number(result.totalTds),
      totalNet: Number(result.totalNet),
      totalDebtPayout: Number(result.totalDebtPayout),
      totalLeaveCashout: Number(result.totalLeaveCashout),
      cycleDays,
      payments: result.payments.map((p) => ({
        ...p,
        grossAmount: Number(p.grossAmount),
        tdsRate: Number(p.tdsRate),
        tdsAmount: Number(p.tdsAmount),
        leaveCashoutDays: Number(p.leaveCashoutDays),
        leaveCashoutAmount: Number(p.leaveCashoutAmount),
        debtPayoutAmount: Number(p.debtPayoutAmount),
        accountDebitAmount: Number(p.accountDebitAmount),
        netAmount: Number(p.netAmount),
        lokwasi: {
          ...p.lokwasi,
          leaveBalance: Number(p.lokwasi.leaveBalance),
          salaryDebtBalance: Number(p.lokwasi.salaryDebtBalance),
          accountBalance: Number(p.lokwasi.accountBalance),
        },
      })),
    }

    return NextResponse.json({ payrollRun: transformedRun })
  } catch (error) {
    console.error('Error updating payroll payments:', error)
    return NextResponse.json(
      { error: 'Failed to update payments' },
      { status: 500 }
    )
  }
}
