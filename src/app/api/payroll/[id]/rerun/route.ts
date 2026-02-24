import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateCustomerReference } from '@/lib/calculations/payroll'

/**
 * POST /api/payroll/[id]/rerun
 * Creates a new payroll run with the same details as the original,
 * but with fresh bank detail snapshots from the current lokwasi data.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params

  try {
    // Fetch the original payroll run with payments
    const originalRun = await prisma.payrollRun.findUnique({
      where: { id },
      include: {
        payments: {
          include: {
            lokwasi: true,
          },
        },
      },
    })

    if (!originalRun) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
    }

    // Only allow re-running PENDING or CANCELLED runs
    if (originalRun.status === 'PAID') {
      return NextResponse.json(
        { error: 'Cannot re-run a payroll that has already been paid' },
        { status: 400 }
      )
    }

    const runDateObj = new Date(originalRun.runDate)

    // Get fresh lokwasi data for all employees in the original run
    const lokwasiIds = originalRun.payments.map((p) => p.lokwasiId)
    const freshLokwasis = await prisma.lokwasi.findMany({
      where: { id: { in: lokwasiIds } },
    })

    // Create a map for quick lookup
    const lokwasiMap = new Map(freshLokwasis.map((l) => [l.id, l]))

    // Build new payment data with fresh snapshots
    const paymentData = originalRun.payments.map((p, index) => {
      const lokwasi = lokwasiMap.get(p.lokwasiId)
      if (!lokwasi) {
        throw new Error(`Lokwasi ${p.lokwasiId} not found`)
      }

      // Recalculate TDS with current rate (in case it changed)
      const grossAmount = Number(p.grossAmount)
      const leaveCashoutAmount = Number(p.leaveCashoutAmount)
      const debtPayoutAmount = Number(p.debtPayoutAmount)
      const tdsRate = Number(lokwasi.tdsRate)

      // TDS is on salary + leave cashout (not debt payout)
      const taxableAmount = grossAmount + leaveCashoutAmount
      const tdsAmount = Math.ceil(taxableAmount * tdsRate / 100)
      const netAmount = taxableAmount - tdsAmount + debtPayoutAmount

      // Generate new customer reference
      const customerReference = generateCustomerReference(runDateObj, index + 1)

      return {
        lokwasiId: lokwasi.id,
        grossAmount,
        tdsRate,
        tdsAmount,
        leaveCashoutDays: Number(p.leaveCashoutDays),
        leaveCashoutAmount,
        debtPayoutAmount,
        netAmount,
        customerReference,
        // Fresh snapshots from current lokwasi data
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

    // Create new payroll run in a transaction
    const newPayrollRun = await prisma.$transaction(async (tx) => {
      // Cancel the original run if it's still pending
      if (originalRun.status === 'PENDING' || originalRun.status === 'PROCESSED') {
        await tx.payrollRun.update({
          where: { id: originalRun.id },
          data: { status: 'CANCELLED' },
        })
      }

      // Create the new payroll run
      const run = await tx.payrollRun.create({
        data: {
          runDate: runDateObj,
          payPeriodStart: originalRun.payPeriodStart,
          payPeriodEnd: originalRun.payPeriodEnd,
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

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session!.user.id,
          action: 'RERUN_PAYROLL',
          entityType: 'payroll_run',
          entityId: run.id,
          oldValues: {
            originalRunId: originalRun.id,
          },
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
      ...newPayrollRun,
      totalGross: Number(newPayrollRun.totalGross),
      totalTds: Number(newPayrollRun.totalTds),
      totalNet: Number(newPayrollRun.totalNet),
      totalDebtPayout: Number(newPayrollRun.totalDebtPayout),
      totalLeaveCashout: Number(newPayrollRun.totalLeaveCashout),
      payments: newPayrollRun.payments.map((p) => ({
        ...p,
        grossAmount: Number(p.grossAmount),
        tdsRate: Number(p.tdsRate),
        tdsAmount: Number(p.tdsAmount),
        leaveCashoutDays: Number(p.leaveCashoutDays),
        leaveCashoutAmount: Number(p.leaveCashoutAmount),
        debtPayoutAmount: Number(p.debtPayoutAmount),
        netAmount: Number(p.netAmount),
      })),
    }

    return NextResponse.json({
      message: 'Payroll re-run created successfully',
      payrollRun: transformedRun,
      cancelledRunId: originalRun.id,
    }, { status: 201 })
  } catch (error) {
    console.error('Error re-running payroll:', error)
    const message = error instanceof Error ? error.message : 'Failed to re-run payroll'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
