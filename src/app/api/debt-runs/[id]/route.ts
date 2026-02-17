import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DebtRunStatus } from '@prisma/client'

// GET /api/debt-runs/[id] - Get a single debt run with payments
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
    const debtRun = await prisma.debtRun.findUnique({
      where: { id },
      include: {
        debtPayments: {
          include: {
            lokwasi: {
              select: {
                id: true,
                name: true,
                employeeCode: true,
                bankName: true,
                isAxisBank: true,
                pan: true,
                aadhaar: true,
                natureOfWork: true,
                tdsRate: true,
              },
            },
          },
        },
        createdBy: { select: { name: true } },
        processedBy: { select: { name: true } },
      },
    })

    if (!debtRun) {
      return NextResponse.json({ error: 'Debt run not found' }, { status: 404 })
    }

    // Transform Decimal to number for JSON
    const transformedRun = {
      ...debtRun,
      totalGross: Number(debtRun.totalGross),
      totalTds: Number(debtRun.totalTds),
      totalNet: Number(debtRun.totalNet),
      debtPayments: debtRun.debtPayments.map((p) => ({
        ...p,
        amount: Number(p.amount),
        tdsRate: p.tdsRate ? Number(p.tdsRate) : null,
        tdsAmount: p.tdsAmount ? Number(p.tdsAmount) : null,
        netAmount: p.netAmount ? Number(p.netAmount) : null,
        balanceAfter: Number(p.balanceAfter),
        lokwasi: {
          ...p.lokwasi,
          tdsRate: Number(p.lokwasi.tdsRate),
        },
      })),
    }

    return NextResponse.json({ debtRun: transformedRun })
  } catch (error) {
    console.error('Error fetching debt run:', error)
    return NextResponse.json(
      { error: 'Failed to fetch debt run' },
      { status: 500 }
    )
  }
}

// PATCH /api/debt-runs/[id] - Update debt run status
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

    const oldRun = await prisma.debtRun.findUnique({
      where: { id },
      include: {
        debtPayments: {
          include: {
            lokwasi: {
              select: {
                id: true,
                name: true,
                employeeCode: true,
                pan: true,
                aadhaar: true,
                natureOfWork: true,
              },
            },
          },
        },
      },
    })

    if (!oldRun) {
      return NextResponse.json({ error: 'Debt run not found' }, { status: 404 })
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      PENDING: ['PROCESSED', 'CANCELLED'],
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
      status?: DebtRunStatus
      notes?: string
      processedAt?: Date
      processedById?: string
      paidAt?: Date
    } = {}

    if (status) {
      updateData.status = status as DebtRunStatus
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

    const debtRun = await prisma.$transaction(async (tx) => {
      const run = await tx.debtRun.update({
        where: { id },
        data: updateData,
        include: {
          debtPayments: {
            include: {
              lokwasi: {
                select: {
                  id: true,
                  name: true,
                  employeeCode: true,
                  bankName: true,
                  isAxisBank: true,
                  pan: true,
                  aadhaar: true,
                  natureOfWork: true,
                  tdsRate: true,
                },
              },
            },
          },
        },
      })

      // When marking as PAID, update TDS monthly records
      // Use CURRENT date (when payment is processed) not the run date,
      // since TDS is reported in the month of actual payment
      if (status === 'PAID') {
        const paidDate = new Date()
        const year = paidDate.getFullYear()
        const month = paidDate.getMonth() + 1

        for (const payment of run.debtPayments) {
          // Skip if no TDS calculated
          if (!payment.tdsAmount) continue

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

          const grossAmount = Number(payment.amount)
          const tdsAmount = Number(payment.tdsAmount)
          const netAmount = Number(payment.netAmount)

          if (existingTds) {
            await tx.tdsMonthly.update({
              where: { id: existingTds.id },
              data: {
                totalGross: { increment: grossAmount },
                totalTds: { increment: tdsAmount },
                totalNet: { increment: netAmount },
                paymentCount: { increment: 1 },
                totalTdsPayable: { increment: tdsAmount },
              },
            })
          } else {
            await tx.tdsMonthly.create({
              data: {
                year,
                month,
                lokwasiId: payment.lokwasiId,
                totalGross: grossAmount,
                totalTds: tdsAmount,
                totalNet: netAmount,
                paymentCount: 1,
                totalTdsPayable: tdsAmount,
                filingStatus: 'PENDING',
              },
            })
          }
        }
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session!.user.id,
          action: `UPDATE_DEBT_RUN_${status || 'NOTES'}`,
          entityType: 'debt_run',
          entityId: run.id,
          oldValues: { status: oldRun.status, notes: oldRun.notes },
          newValues: { status: run.status, notes: run.notes },
        },
      })

      return run
    }, {
      timeout: 30000, // 30 seconds - default is 5 seconds which times out with many TDS records
    })

    // Transform Decimal to number for JSON
    const transformedRun = {
      ...debtRun,
      totalGross: Number(debtRun.totalGross),
      totalTds: Number(debtRun.totalTds),
      totalNet: Number(debtRun.totalNet),
      debtPayments: debtRun.debtPayments.map((p) => ({
        ...p,
        amount: Number(p.amount),
        tdsRate: p.tdsRate ? Number(p.tdsRate) : null,
        tdsAmount: p.tdsAmount ? Number(p.tdsAmount) : null,
        netAmount: p.netAmount ? Number(p.netAmount) : null,
        balanceAfter: Number(p.balanceAfter),
        lokwasi: {
          ...p.lokwasi,
          tdsRate: Number(p.lokwasi.tdsRate),
        },
      })),
    }

    return NextResponse.json({ debtRun: transformedRun })
  } catch (error) {
    console.error('Error updating debt run:', error)
    const message = error instanceof Error ? error.message : 'Failed to update debt run'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
