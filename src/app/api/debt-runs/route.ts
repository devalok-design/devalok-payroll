import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateDebtReference, calculateTds } from '@/lib/calculations/payroll'
import { requireViewer, requireAdmin } from '@/lib/rbac'

// GET /api/debt-runs - List all debt runs
export async function GET() {
  const session = await auth()
  const rbacError = requireViewer(session)
  if (rbacError) return rbacError

  try {
    const debtRuns = await prisma.debtRun.findMany({
      orderBy: { runDate: 'desc' },
      include: {
        _count: { select: { debtPayments: true } },
      },
    })

    // Transform Decimal to number for JSON
    const transformedRuns = debtRuns.map((run) => ({
      ...run,
      totalGross: Number(run.totalGross),
      totalTds: Number(run.totalTds),
      totalNet: Number(run.totalNet),
    }))

    return NextResponse.json({ debtRuns: transformedRuns })
  } catch (error) {
    console.error('Error fetching debt runs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch debt runs' },
      { status: 500 }
    )
  }
}

// POST /api/debt-runs - Create a new standalone debt run
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

    const runDateObj = new Date(runDate)

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

    // Validate and calculate payments
    const paymentData = payments.map((p: {
      lokwasiId: string
      amount: number
      notes?: string
    }, index: number) => {
      const lokwasi = lokwasis.find((l) => l.id === p.lokwasiId)!
      const grossAmount = p.amount
      const tdsRate = Number(lokwasi.tdsRate)

      // Validate amount doesn't exceed balance
      if (grossAmount > Number(lokwasi.salaryDebtBalance)) {
        throw new Error(`Amount exceeds debt balance for ${lokwasi.name}`)
      }

      // Calculate TDS on debt payout (debt is taxable salary)
      const tdsAmount = calculateTds(grossAmount, tdsRate)
      const netAmount = grossAmount - tdsAmount

      // Generate customer reference
      const customerReference = generateDebtReference(runDateObj, index + 1)

      return {
        lokwasiId: lokwasi.id,
        amount: grossAmount,
        tdsRate,
        tdsAmount,
        netAmount,
        balanceAfter: Number(lokwasi.salaryDebtBalance) - grossAmount,
        customerReference,
        paymentDate: runDateObj,
        notes: p.notes || `Standalone debt payout`,
        // Snapshot bank details
        snapshotBankAccount: lokwasi.bankAccount,
        snapshotIfsc: lokwasi.ifscCode,
        snapshotBankName: lokwasi.bankName,
        snapshotIsAxisBank: lokwasi.isAxisBank,
      }
    })

    // Calculate totals
    const totals = paymentData.reduce(
      (acc, p) => ({
        totalGross: acc.totalGross + p.amount,
        totalTds: acc.totalTds + p.tdsAmount,
        totalNet: acc.totalNet + p.netAmount,
      }),
      { totalGross: 0, totalTds: 0, totalNet: 0 }
    )

    // Create debt run with payments in a transaction
    const debtRun = await prisma.$transaction(async (tx) => {
      // Create the debt run
      const run = await tx.debtRun.create({
        data: {
          runDate: runDateObj,
          status: 'PENDING',
          totalGross: totals.totalGross,
          totalTds: totals.totalTds,
          totalNet: totals.totalNet,
          employeeCount: paymentData.length,
          createdById: session!.user.id,
        },
      })

      // Create debt payments and update balances
      for (const payment of paymentData) {
        // Update lokwasi debt balance
        await tx.lokwasi.update({
          where: { id: payment.lokwasiId },
          data: {
            salaryDebtBalance: {
              decrement: payment.amount,
            },
          },
        })

        // Create debt payment record
        await tx.debtPayment.create({
          data: {
            lokwasiId: payment.lokwasiId,
            debtRunId: run.id,
            amount: payment.amount,
            tdsRate: payment.tdsRate,
            tdsAmount: payment.tdsAmount,
            netAmount: payment.netAmount,
            balanceAfter: payment.balanceAfter,
            customerReference: payment.customerReference,
            paymentDate: payment.paymentDate,
            notes: payment.notes,
            snapshotBankAccount: payment.snapshotBankAccount,
            snapshotIfsc: payment.snapshotIfsc,
            snapshotBankName: payment.snapshotBankName,
            snapshotIsAxisBank: payment.snapshotIsAxisBank,
            isAddition: false,
          },
        })
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session!.user.id,
          action: 'CREATE_DEBT_RUN',
          entityType: 'debt_run',
          entityId: run.id,
          newValues: {
            runDate: run.runDate,
            employeeCount: run.employeeCount,
            totalNet: Number(run.totalNet),
          },
        },
      })

      // Fetch the run with payments
      const fullRun = await tx.debtRun.findUnique({
        where: { id: run.id },
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
                },
              },
            },
          },
        },
      })

      return fullRun
    })

    if (!debtRun) {
      throw new Error('Failed to create debt run')
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
      })),
    }

    return NextResponse.json({ debtRun: transformedRun }, { status: 201 })
  } catch (error) {
    console.error('Error creating debt run:', error)
    const message = error instanceof Error ? error.message : 'Failed to create debt run'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
