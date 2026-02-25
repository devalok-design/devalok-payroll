import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PayrollStatus } from '@prisma/client'
import { requireViewer, requireAdmin } from '@/lib/rbac'
import { createAccountTransaction } from '@/lib/account/transactions'

// GET /api/payroll/[id] - Get a single payroll run with payments
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  const rbacError = requireViewer(session)
  if (rbacError) return rbacError

  const { id } = params

  try {
    const payrollRun = await prisma.payrollRun.findUnique({
      where: { id },
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
        createdBy: { select: { name: true } },
        processedBy: { select: { name: true } },
      },
    })

    if (!payrollRun) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
    }

    // Get cycleDays from active schedule
    const schedule = await prisma.payrollSchedule.findFirst({
      where: { isActive: true },
      select: { cycleDays: true },
    })

    // Transform Decimal to number for JSON
    const transformedRun = {
      ...payrollRun,
      totalGross: Number(payrollRun.totalGross),
      totalTds: Number(payrollRun.totalTds),
      totalNet: Number(payrollRun.totalNet),
      totalDebtPayout: Number(payrollRun.totalDebtPayout),
      totalLeaveCashout: Number(payrollRun.totalLeaveCashout),
      cycleDays: schedule?.cycleDays || 14,
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
    console.error('Error fetching payroll run:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payroll run' },
      { status: 500 }
    )
  }
}

// PATCH /api/payroll/[id] - Update payroll run status
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
    const { status, notes } = body

    const oldRun = await prisma.payrollRun.findUnique({
      where: { id },
    })

    if (!oldRun) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      PENDING: ['DRAFT', 'PROCESSED', 'CANCELLED'],
      DRAFT: ['PENDING', 'PROCESSED', 'CANCELLED'],
      PROCESSED: ['PAID', 'PENDING'],
      PAID: [], // Cannot change from PAID
      CANCELLED: [], // Cannot change from CANCELLED
    }

    if (status && !validTransitions[oldRun.status]?.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${oldRun.status} to ${status}` },
        { status: 400 }
      )
    }

    const updateData: {
      status?: PayrollStatus
      notes?: string
      processedAt?: Date
      processedById?: string
      paidAt?: Date
    } = {}

    if (status) {
      updateData.status = status as PayrollStatus
      if (status === 'PROCESSED' && oldRun.status !== 'PROCESSED') {
        updateData.processedAt = new Date()
        updateData.processedById = session!.user.id
      }
      if (status === 'PAID' && oldRun.status !== 'PAID') {
        updateData.paidAt = new Date()
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    const payrollRun = await prisma.$transaction(async (tx) => {
      // Get payments for this payroll run (needed for both cleanup and PAID operations)
      const payments = await tx.payment.findMany({
        where: { payrollRunId: id },
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
      })

      // Clean up TDS records when reverting from PROCESSED/PAID to PENDING
      if (status === 'PENDING' && (oldRun.status === 'PROCESSED' || oldRun.status === 'PAID')) {
        // If payroll was PAID, TDS records were created - we need to reverse them
        if (oldRun.status === 'PAID' && oldRun.paidAt) {
          const paidDate = oldRun.paidAt
          const year = paidDate.getFullYear()
          const month = paidDate.getMonth() + 1

          for (const payment of payments) {
            // Find the TDS monthly record
            const existingTds = await tx.tdsMonthly.findUnique({
              where: {
                year_month_lokwasiId: {
                  year,
                  month,
                  lokwasiId: payment.lokwasiId,
                },
              },
            })

            if (existingTds) {
              // Decrement the TDS amounts that were added when marking as PAID
              const newTotalGross = Number(existingTds.totalGross) - (Number(payment.grossAmount) + Number(payment.leaveCashoutAmount) + Number(payment.debtPayoutAmount))
              const newTotalTds = Number(existingTds.totalTds) - Number(payment.tdsAmount)
              const newTotalNet = Number(existingTds.totalNet) - Number(payment.netAmount)
              const newPaymentCount = existingTds.paymentCount - 1

              if (newPaymentCount <= 0) {
                // Delete the record if this was the only payment
                await tx.tdsMonthly.delete({
                  where: { id: existingTds.id },
                })
              } else {
                // Update with decremented values
                await tx.tdsMonthly.update({
                  where: { id: existingTds.id },
                  data: {
                    totalGross: newTotalGross,
                    totalTds: newTotalTds,
                    totalNet: newTotalNet,
                    paymentCount: newPaymentCount,
                    totalTdsPayable: newTotalTds,
                  },
                })
              }
            }
          }

          // Revert payment statuses back to PENDING
          await tx.payment.updateMany({
            where: { payrollRunId: id },
            data: {
              paymentStatus: 'PENDING',
              paidAt: null,
            },
          })
        }
      }

      const run = await tx.payrollRun.update({
        where: { id },
        data: updateData,
      })

      // Mark all payments as FAILED when payroll run is cancelled
      if (status === 'CANCELLED') {
        await tx.payment.updateMany({
          where: { payrollRunId: id },
          data: { paymentStatus: 'FAILED' },
        })
      }

      // Update payment statuses when marking payroll as PAID
      if (status === 'PAID') {
        await tx.payment.updateMany({
          where: { payrollRunId: id },
          data: {
            paymentStatus: 'PAID',
            paidAt: new Date(),
          },
        })

        // Update payroll schedule with next date based on cycle days
        const activeSchedule = await tx.payrollSchedule.findFirst({
          where: { isActive: true },
          select: { id: true, cycleDays: true, lastPayrollDate: true },
        })

        if (activeSchedule) {
          // Only advance lastPayrollDate forward — marking an older payroll
          // as PAID should not regress the schedule
          if (run.runDate > activeSchedule.lastPayrollDate) {
            const nextDate = new Date(run.runDate)
            nextDate.setDate(nextDate.getDate() + activeSchedule.cycleDays)

            await tx.payrollSchedule.update({
              where: { id: activeSchedule.id },
              data: {
                lastPayrollDate: run.runDate,
                nextPayrollDate: nextDate,
              },
            })
          }
        }

        // Update TDS monthly records - use CURRENT date (when payment is processed)
        // not the payroll run date, since TDS is reported in the month of actual payment
        const paidDate = new Date() // Today's date when marking as paid
        const year = paidDate.getFullYear()
        const month = paidDate.getMonth() + 1

        for (const payment of payments) {
          // Find or create TDS monthly record
          const existingTds = await tx.tdsMonthly.findUnique({
            where: {
              year_month_lokwasiId: {
                year,
                month,
                lokwasiId: payment.lokwasiId,
              },
            },
          })

          if (existingTds) {
            await tx.tdsMonthly.update({
              where: { id: existingTds.id },
              data: {
                totalGross: { increment: Number(payment.grossAmount) + Number(payment.leaveCashoutAmount) + Number(payment.debtPayoutAmount) },
                totalTds: { increment: Number(payment.tdsAmount) },
                totalNet: { increment: Number(payment.netAmount) },
                paymentCount: { increment: 1 },
                totalTdsPayable: { increment: Number(payment.tdsAmount) },
              },
            })
          } else {
            await tx.tdsMonthly.create({
              data: {
                year,
                month,
                lokwasiId: payment.lokwasiId,
                totalGross: Number(payment.grossAmount) + Number(payment.leaveCashoutAmount) + Number(payment.debtPayoutAmount),
                totalTds: Number(payment.tdsAmount),
                totalNet: Number(payment.netAmount),
                paymentCount: 1,
                totalTdsPayable: Number(payment.tdsAmount),
                filingStatus: 'PENDING',
              },
            })
          }
        }

        // Deferred balance updates: handle leave/debt/account transactions
        // For auto-generated payrolls (or payrolls edited via inline PATCH), these records
        // may not exist yet. Check and create them idempotently.
        const runDateObj = new Date(run.runDate)

        for (const payment of payments) {
          const leaveCashoutDays = Number(payment.leaveCashoutDays)
          const leaveCashoutAmount = Number(payment.leaveCashoutAmount)
          const debtPayoutAmount = Number(payment.debtPayoutAmount)
          const accountDebitAmount = Number(payment.accountDebitAmount)
          const grossAmount = Number(payment.grossAmount)

          // Handle leave cashout balance updates
          if (leaveCashoutDays > 0) {
            const existingLeaveTx = await tx.leaveTransaction.findFirst({
              where: { paymentId: payment.id },
            })
            if (!existingLeaveTx) {
              await tx.lokwasi.update({
                where: { id: payment.lokwasiId },
                data: { leaveBalance: { decrement: leaveCashoutDays } },
              })
              const updatedLokwasi = await tx.lokwasi.findUnique({
                where: { id: payment.lokwasiId },
                select: { leaveBalance: true },
              })
              await tx.leaveTransaction.create({
                data: {
                  lokwasiId: payment.lokwasiId,
                  transactionType: 'CASHOUT',
                  days: -leaveCashoutDays,
                  balanceAfter: updatedLokwasi!.leaveBalance,
                  paymentId: payment.id,
                  transactionDate: runDateObj,
                  createdById: session!.user.id,
                  notes: `Leave cashout for payroll ${id}`,
                },
              })
            }
          }

          // Handle debt payout balance updates
          if (debtPayoutAmount > 0) {
            const existingDebtPmt = await tx.debtPayment.findFirst({
              where: { paymentId: payment.id },
            })
            if (!existingDebtPmt) {
              await tx.lokwasi.update({
                where: { id: payment.lokwasiId },
                data: { salaryDebtBalance: { decrement: debtPayoutAmount } },
              })
              const updatedLokwasi = await tx.lokwasi.findUnique({
                where: { id: payment.lokwasiId },
                select: { salaryDebtBalance: true },
              })
              await tx.debtPayment.create({
                data: {
                  lokwasiId: payment.lokwasiId,
                  paymentId: payment.id,
                  amount: debtPayoutAmount,
                  balanceAfter: updatedLokwasi!.salaryDebtBalance,
                  paymentDate: runDateObj,
                  notes: `Debt payout for payroll ${id}`,
                },
              })
            }
          }

          // Handle account transactions (salary credit, leave cashout, recovery)
          const existingSalaryTx = await tx.accountTransaction.findFirst({
            where: { paymentId: payment.id, category: 'REGULAR_SALARY' },
          })
          if (!existingSalaryTx) {
            // Salary credit
            await createAccountTransaction(tx, {
              lokwasiId: payment.lokwasiId,
              type: 'CREDIT',
              category: 'REGULAR_SALARY',
              amount: grossAmount,
              description: `Salary for ${runDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
              paymentId: payment.id,
              transactionDate: runDateObj,
              createdById: session!.user.id,
            })

            // Leave cashout credit
            if (leaveCashoutAmount > 0) {
              await createAccountTransaction(tx, {
                lokwasiId: payment.lokwasiId,
                type: 'CREDIT',
                category: 'LEAVE_CASHOUT',
                amount: leaveCashoutAmount,
                description: `Leave cashout (${leaveCashoutDays} days)`,
                paymentId: payment.id,
                transactionDate: runDateObj,
                createdById: session!.user.id,
              })
            }

            // Account recovery debit
            if (accountDebitAmount > 0) {
              await createAccountTransaction(tx, {
                lokwasiId: payment.lokwasiId,
                type: 'DEBIT',
                category: 'ADVANCE_RECOVERY',
                amount: accountDebitAmount,
                description: `Advance recovery from payroll`,
                paymentId: payment.id,
                transactionDate: runDateObj,
                createdById: session!.user.id,
              })
            }
          }
        }
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session!.user.id,
          action: `UPDATE_PAYROLL_RUN_${status || 'NOTES'}`,
          entityType: 'payroll_run',
          entityId: run.id,
          oldValues: { status: oldRun.status, notes: oldRun.notes },
          newValues: { status: run.status, notes: run.notes },
        },
      })

      return { run, payments }
    }, {
      timeout: 30000, // 30 seconds - default is 5 seconds which times out with many TDS records
    })

    // Transform Decimal to number for JSON
    const transformedRun = {
      ...payrollRun.run,
      totalGross: Number(payrollRun.run.totalGross),
      totalTds: Number(payrollRun.run.totalTds),
      totalNet: Number(payrollRun.run.totalNet),
      totalDebtPayout: Number(payrollRun.run.totalDebtPayout),
      totalLeaveCashout: Number(payrollRun.run.totalLeaveCashout),
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

    return NextResponse.json({ payrollRun: transformedRun })
  } catch (error) {
    console.error('Error updating payroll run:', error)
    const message = error instanceof Error ? error.message : 'Failed to update payroll run'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
