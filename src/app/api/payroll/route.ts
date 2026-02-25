import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPayPeriod, generateCustomerReference } from '@/lib/calculations/payroll'
import { requireStaff, requireAdmin } from '@/lib/rbac'
import { createAccountTransaction } from '@/lib/account/transactions'

// GET /api/payroll - List all payroll runs
export async function GET() {
  const session = await auth()
  const rbacError = requireStaff(session)
  if (rbacError) return rbacError

  try {
    const payrollRuns = await prisma.payrollRun.findMany({
      orderBy: { runDate: 'desc' },
      include: {
        _count: { select: { payments: true } },
      },
    })

    return NextResponse.json({ payrollRuns })
  } catch (error) {
    console.error('Error fetching payroll runs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payroll runs' },
      { status: 500 }
    )
  }
}

// POST /api/payroll - Create a new payroll run
export async function POST(request: NextRequest) {
  const session = await auth()
  const rbacError = requireAdmin(session)
  if (rbacError) return rbacError

  try {
    const body = await request.json()
    const { runDate, payments } = body

    if (!runDate || !payments || !Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: runDate and payments array required' },
        { status: 400 }
      )
    }

    // Get active payroll schedule for cycle days
    const schedule = await prisma.payrollSchedule.findFirst({
      where: { isActive: true },
      select: { cycleDays: true },
    })

    if (!schedule) {
      return NextResponse.json(
        { error: 'No active payroll schedule found' },
        { status: 400 }
      )
    }

    const cycleDays = schedule.cycleDays
    const runDateObj = new Date(runDate)
    const { start: payPeriodStart, end: payPeriodEnd } = getPayPeriod(runDateObj, cycleDays)

    // Get all lokwasis for the payments
    const lokwasiIds = payments.map((p: { lokwasiId: string }) => p.lokwasiId)
    const lokwasis = await prisma.lokwasi.findMany({
      where: { id: { in: lokwasiIds } },
    })

    if (lokwasis.length !== payments.length) {
      return NextResponse.json(
        { error: 'Some employees not found' },
        { status: 400 }
      )
    }

    // Validate leave and debt balances before proceeding
    for (const p of payments) {
      const lokwasi = lokwasis.find((l) => l.id === p.lokwasiId)!
      const leaveCashoutDays = p.leaveCashoutDays || 0
      const debtPayoutAmount = p.debtPayoutAmount || 0

      // Validate leave balance
      if (leaveCashoutDays > 0 && leaveCashoutDays > Number(lokwasi.leaveBalance)) {
        return NextResponse.json(
          {
            error: `Insufficient leave balance for ${lokwasi.name}. ` +
                   `Requested: ${leaveCashoutDays} days, Available: ${Number(lokwasi.leaveBalance)} days`
          },
          { status: 400 }
        )
      }

      // Validate debt balance
      if (debtPayoutAmount > 0 && debtPayoutAmount > Number(lokwasi.salaryDebtBalance)) {
        return NextResponse.json(
          {
            error: `Insufficient debt balance for ${lokwasi.name}. ` +
                   `Requested: ₹${debtPayoutAmount}, Available: ₹${Number(lokwasi.salaryDebtBalance)}`
          },
          { status: 400 }
        )
      }
    }

    // Calculate payments
    const paymentData = payments.map((p: {
      lokwasiId: string
      leaveCashoutDays?: number
      debtPayoutAmount?: number
    }, index: number) => {
      const lokwasi = lokwasis.find((l) => l.id === p.lokwasiId)!
      const grossSalary = Number(lokwasi.grossSalary)
      const tdsRate = Number(lokwasi.tdsRate)
      const accountBalance = Number(lokwasi.accountBalance)
      const leaveCashoutDays = p.leaveCashoutDays || 0
      const debtPayoutAmount = p.debtPayoutAmount || 0

      // Calculate leave cashout (using cycle days from schedule)
      const dailyRate = grossSalary / cycleDays
      const leaveCashoutAmount = Math.round(dailyRate * leaveCashoutDays * 100) / 100

      // Calculate TDS (applies to all payments: salary, leave cashout, and debt payout)
      const taxableAmount = grossSalary + leaveCashoutAmount + debtPayoutAmount
      const tdsAmount = Math.ceil(taxableAmount * tdsRate / 100)

      // Net before account recovery
      const netBeforeRecovery = taxableAmount - tdsAmount

      // Account recovery: if balance is negative, deduct from net pay (100% recovery)
      let accountDebitAmount = 0
      if (accountBalance < 0) {
        const amountOwed = Math.abs(accountBalance)
        accountDebitAmount = Math.min(amountOwed, netBeforeRecovery)
      }

      // Final net amount after recovery
      const netAmount = netBeforeRecovery - accountDebitAmount

      // Generate customer reference
      const customerReference = generateCustomerReference(runDateObj, index + 1)

      return {
        lokwasiId: lokwasi.id,
        grossAmount: grossSalary,
        tdsRate,
        tdsAmount,
        leaveCashoutDays,
        leaveCashoutAmount,
        debtPayoutAmount,
        accountDebitAmount,
        netAmount,
        customerReference,
        // Snapshot bank details
        snapshotPan: lokwasi.pan,
        snapshotAadhaar: lokwasi.aadhaar,
        snapshotBankAccount: lokwasi.bankAccount,
        snapshotIfsc: lokwasi.ifscCode,
        snapshotBankName: lokwasi.bankName,
        snapshotIsAxisBank: lokwasi.isAxisBank,
      }
    })

    // Calculate totals
    const totals = paymentData.reduce(
      (acc, p) => ({
        totalGross: acc.totalGross + p.grossAmount + p.leaveCashoutAmount,
        totalTds: acc.totalTds + p.tdsAmount,
        totalNet: acc.totalNet + p.netAmount,
        totalDebtPayout: acc.totalDebtPayout + p.debtPayoutAmount,
        totalLeaveCashout: acc.totalLeaveCashout + p.leaveCashoutAmount,
      }),
      { totalGross: 0, totalTds: 0, totalNet: 0, totalDebtPayout: 0, totalLeaveCashout: 0 }
    )

    // Create payroll run with payments in a transaction
    const payrollRun = await prisma.$transaction(async (tx) => {
      // Create the payroll run
      const run = await tx.payrollRun.create({
        data: {
          runDate: runDateObj,
          payPeriodStart,
          payPeriodEnd,
          status: 'PENDING',
          totalGross: totals.totalGross,
          totalTds: totals.totalTds,
          totalNet: totals.totalNet,
          totalDebtPayout: totals.totalDebtPayout,
          totalLeaveCashout: totals.totalLeaveCashout,
          employeeCount: paymentData.length,
          createdById: session!.user.id,
          payments: {
            create: paymentData,
          },
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
                },
              },
            },
          },
        },
      })

      // Update lokwasi balances and create transaction records atomically
      for (const payment of paymentData) {
        const lokwasi = lokwasis.find((l) => l.id === payment.lokwasiId)!
        const paymentRecord = run.payments.find((p) => p.lokwasiId === lokwasi.id)

        // Build atomic update data
        const updateData: {
          leaveBalance?: { decrement: number }
          salaryDebtBalance?: { decrement: number }
        } = {}

        if (payment.leaveCashoutDays > 0) {
          updateData.leaveBalance = { decrement: payment.leaveCashoutDays }
        }

        if (payment.debtPayoutAmount > 0) {
          updateData.salaryDebtBalance = { decrement: payment.debtPayoutAmount }
        }

        // Perform single atomic update if there are any balance changes
        if (Object.keys(updateData).length > 0) {
          await tx.lokwasi.update({
            where: { id: lokwasi.id },
            data: updateData,
          })
        }

        // Get updated balances for transaction records
        const updatedLokwasi = await tx.lokwasi.findUnique({
          where: { id: lokwasi.id },
          select: { leaveBalance: true, salaryDebtBalance: true },
        })

        // Create leave transaction record if applicable
        if (payment.leaveCashoutDays > 0) {
          await tx.leaveTransaction.create({
            data: {
              lokwasiId: lokwasi.id,
              transactionType: 'CASHOUT',
              days: -payment.leaveCashoutDays,
              balanceAfter: updatedLokwasi!.leaveBalance,
              paymentId: paymentRecord?.id,
              transactionDate: runDateObj,
              createdById: session!.user.id,
              notes: `Leave cashout for payroll ${run.id}`,
            },
          })
        }

        // Create debt payment record if applicable
        if (payment.debtPayoutAmount > 0) {
          await tx.debtPayment.create({
            data: {
              lokwasiId: lokwasi.id,
              paymentId: paymentRecord?.id,
              amount: payment.debtPayoutAmount,
              balanceAfter: updatedLokwasi!.salaryDebtBalance,
              paymentDate: runDateObj,
              notes: `Debt payout for payroll ${run.id}`,
            },
          })
        }

        // Create account transaction for salary credit
        await createAccountTransaction(tx, {
          lokwasiId: lokwasi.id,
          type: 'CREDIT',
          category: 'REGULAR_SALARY',
          amount: payment.grossAmount,
          description: `Salary for ${runDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
          paymentId: paymentRecord?.id,
          transactionDate: runDateObj,
          createdById: session!.user.id,
        })

        // Create account transaction for leave cashout if applicable
        if (payment.leaveCashoutAmount > 0) {
          await createAccountTransaction(tx, {
            lokwasiId: lokwasi.id,
            type: 'CREDIT',
            category: 'LEAVE_CASHOUT',
            amount: payment.leaveCashoutAmount,
            description: `Leave cashout (${payment.leaveCashoutDays} days)`,
            paymentId: paymentRecord?.id,
            transactionDate: runDateObj,
            createdById: session!.user.id,
          })
        }

        // Create account transaction for account recovery if applicable
        if (payment.accountDebitAmount > 0) {
          await createAccountTransaction(tx, {
            lokwasiId: lokwasi.id,
            type: 'DEBIT',
            category: 'ADVANCE_RECOVERY',
            amount: payment.accountDebitAmount,
            description: `Advance recovery from payroll`,
            paymentId: paymentRecord?.id,
            transactionDate: runDateObj,
            createdById: session!.user.id,
          })
        }
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session!.user.id,
          action: 'CREATE_PAYROLL_RUN',
          entityType: 'payroll_run',
          entityId: run.id,
          newValues: {
            runDate: run.runDate,
            employeeCount: run.employeeCount,
            totalNet: Number(run.totalNet),
          },
        },
      })

      return run
    })

    // Transform Decimal to number for JSON
    const transformedRun = {
      ...payrollRun,
      totalGross: Number(payrollRun.totalGross),
      totalTds: Number(payrollRun.totalTds),
      totalNet: Number(payrollRun.totalNet),
      totalDebtPayout: Number(payrollRun.totalDebtPayout),
      totalLeaveCashout: Number(payrollRun.totalLeaveCashout),
      payments: payrollRun.payments.map((p) => ({
        ...p,
        grossAmount: Number(p.grossAmount),
        tdsRate: Number(p.tdsRate),
        tdsAmount: Number(p.tdsAmount),
        leaveCashoutDays: Number(p.leaveCashoutDays),
        leaveCashoutAmount: Number(p.leaveCashoutAmount),
        debtPayoutAmount: Number(p.debtPayoutAmount),
        accountDebitAmount: Number(p.accountDebitAmount),
        netAmount: Number(p.netAmount),
      })),
    }

    return NextResponse.json({ payrollRun: transformedRun }, { status: 201 })
  } catch (error) {
    console.error('Error creating payroll run:', error)
    return NextResponse.json(
      { error: 'Failed to create payroll run' },
      { status: 500 }
    )
  }
}
