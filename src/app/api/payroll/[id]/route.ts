import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PayrollStatus } from '@prisma/client'

// GET /api/payroll/[id] - Get a single payroll run with payments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

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
        netAmount: Number(p.netAmount),
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
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

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
        updateData.processedById = session.user.id
      }
      if (status === 'PAID' && oldRun.status !== 'PAID') {
        updateData.paidAt = new Date()
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    const payrollRun = await prisma.$transaction(async (tx) => {
      const run = await tx.payrollRun.update({
        where: { id },
        data: updateData,
      })

      // Get payments for this payroll run
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

      // Update payment statuses when marking payroll as PAID
      if (status === 'PAID') {
        await tx.payment.updateMany({
          where: { payrollRunId: id },
          data: {
            paymentStatus: 'PAID',
            paidAt: new Date(),
          },
        })

        // Update payroll schedule
        await tx.payrollSchedule.updateMany({
          where: { isActive: true },
          data: {
            lastPayrollDate: run.runDate,
            nextPayrollDate: new Date(
              new Date(run.runDate).setDate(new Date(run.runDate).getDate() + 14)
            ),
          },
        })

        // Update TDS monthly records
        const runDate = new Date(run.runDate)
        const year = runDate.getFullYear()
        const month = runDate.getMonth() + 1

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
                totalGross: { increment: Number(payment.grossAmount) + Number(payment.leaveCashoutAmount) },
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
                totalGross: Number(payment.grossAmount) + Number(payment.leaveCashoutAmount),
                totalTds: Number(payment.tdsAmount),
                totalNet: Number(payment.netAmount),
                paymentCount: 1,
                totalTdsPayable: Number(payment.tdsAmount),
                filingStatus: 'PENDING',
              },
            })
          }
        }
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: `UPDATE_PAYROLL_RUN_${status || 'NOTES'}`,
          entityType: 'payroll_run',
          entityId: run.id,
          oldValues: { status: oldRun.status, notes: oldRun.notes },
          newValues: { status: run.status, notes: run.notes },
        },
      })

      return { run, payments }
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
        netAmount: Number(p.netAmount),
      })),
    }

    return NextResponse.json({ payrollRun: transformedRun })
  } catch (error) {
    console.error('Error updating payroll run:', error)
    return NextResponse.json(
      { error: 'Failed to update payroll run' },
      { status: 500 }
    )
  }
}
