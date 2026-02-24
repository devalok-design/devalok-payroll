import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { lokwasiUpdateSchema } from '@/lib/validators/lokwasi'
import { z } from 'zod'

// GET /api/lokwasis/[id] - Get a single lokwasi with payment history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params

  try {
    const lokwasi = await prisma.lokwasi.findUnique({
      where: { id },
    })

    if (!lokwasi) {
      return NextResponse.json({ error: 'Lokwasi not found' }, { status: 404 })
    }

    // Get recent payments - exclude payments from CANCELLED payroll runs
    const payments = await prisma.payment.findMany({
      where: {
        lokwasiId: id,
        payrollRun: { status: { not: 'CANCELLED' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        payrollRun: {
          select: {
            runDate: true,
            status: true,
          },
        },
      },
    })

    // Get debt payments for breakdown
    const debtPayments = await prisma.debtPayment.findMany({
      where: { lokwasiId: id },
      orderBy: { paymentDate: 'desc' },
    })

    // Calculate debt breakdown by source
    const debtBreakdown = debtPayments.reduce(
      (acc, dp) => {
        const amount = Number(dp.amount)
        if (dp.isAddition) {
          acc[dp.source] = (acc[dp.source] || 0) + amount
          acc.total = (acc.total || 0) + amount
        } else {
          acc.paid = (acc.paid || 0) + amount
        }
        return acc
      },
      {} as Record<string, number>
    )

    // Transform Decimal to number for JSON serialization
    const lokwasiData = {
      ...lokwasi,
      tdsRate: Number(lokwasi.tdsRate),
      grossSalary: Number(lokwasi.grossSalary),
      leaveBalance: Number(lokwasi.leaveBalance),
      initialLeaveBalance: Number(lokwasi.initialLeaveBalance),
      salaryDebtBalance: Number(lokwasi.salaryDebtBalance),
    }

    const paymentsData = payments.map((p) => ({
      ...p,
      grossAmount: Number(p.grossAmount),
      tdsRate: Number(p.tdsRate),
      tdsAmount: Number(p.tdsAmount),
      leaveCashoutDays: Number(p.leaveCashoutDays),
      leaveCashoutAmount: Number(p.leaveCashoutAmount),
      debtPayoutAmount: Number(p.debtPayoutAmount),
      netAmount: Number(p.netAmount),
    }))

    const debtPaymentsData = debtPayments.map((dp) => ({
      ...dp,
      amount: Number(dp.amount),
      balanceAfter: Number(dp.balanceAfter),
    }))

    return NextResponse.json({
      lokwasi: lokwasiData,
      payments: paymentsData,
      debtPayments: debtPaymentsData,
      debtBreakdown,
    })
  } catch (error) {
    console.error('Error fetching lokwasi:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lokwasi' },
      { status: 500 }
    )
  }
}

// PUT /api/lokwasis/[id] - Update a lokwasi
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params

  try {
    const body = await request.json()
    const validatedData = lokwasiUpdateSchema.parse(body)

    // Get old values for audit log
    const oldLokwasi = await prisma.lokwasi.findUnique({
      where: { id },
    })

    if (!oldLokwasi) {
      return NextResponse.json({ error: 'Lokwasi not found' }, { status: 404 })
    }

    // Update lokwasi
    const lokwasi = await prisma.lokwasi.update({
      where: { id },
      data: {
        name: validatedData.name,
        pan: validatedData.pan,
        aadhaar: validatedData.aadhaar,
        bankAccount: validatedData.bankAccount,
        ifscCode: validatedData.ifscCode,
        bankName: validatedData.bankName,
        beneficiaryNickname: validatedData.beneficiaryNickname,
        isAxisBank: validatedData.isAxisBank,
        tdsRate: validatedData.tdsRate,
        grossSalary: validatedData.grossSalary,
        natureOfWork: validatedData.natureOfWork,
        leaveBalance: validatedData.leaveBalance,
        salaryDebtBalance: validatedData.salaryDebtBalance,
        status: validatedData.status,
        terminatedDate:
          validatedData.status === 'TERMINATED' && oldLokwasi.status !== 'TERMINATED'
            ? new Date()
            : validatedData.status !== 'TERMINATED'
            ? null
            : oldLokwasi.terminatedDate,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: 'UPDATE_LOKWASI',
        entityType: 'lokwasi',
        entityId: lokwasi.id,
        oldValues: oldLokwasi as object,
        newValues: lokwasi as object,
      },
    })

    // Transform Decimal to number for JSON serialization
    const lokwasiData = {
      ...lokwasi,
      tdsRate: Number(lokwasi.tdsRate),
      grossSalary: Number(lokwasi.grossSalary),
      leaveBalance: Number(lokwasi.leaveBalance),
      initialLeaveBalance: Number(lokwasi.initialLeaveBalance),
      salaryDebtBalance: Number(lokwasi.salaryDebtBalance),
    }

    return NextResponse.json({ lokwasi: lokwasiData })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {}
      error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0] as string] = issue.message
        }
      })
      return NextResponse.json({ errors }, { status: 400 })
    }

    console.error('Error updating lokwasi:', error)
    return NextResponse.json(
      { error: 'Failed to update lokwasi' },
      { status: 500 }
    )
  }
}

// DELETE /api/lokwasis/[id] - Delete a lokwasi (soft delete by setting status to TERMINATED)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params

  try {
    const lokwasi = await prisma.lokwasi.findUnique({
      where: { id },
    })

    if (!lokwasi) {
      return NextResponse.json({ error: 'Lokwasi not found' }, { status: 404 })
    }

    // Calculate total outstanding debt: sum of all PENDING payroll payments for this lokwasi
    const pendingPayments = await prisma.payment.findMany({
      where: {
        lokwasiId: id,
        payrollRun: { status: 'PENDING' },
      },
      select: { grossAmount: true },
    })
    const pendingDebt = pendingPayments.reduce(
      (sum, p) => sum + Number(p.grossAmount),
      0
    )

    // Total owed = existing debt balance + any pending (unprocessed) salary
    const totalDebtOwed = Number(lokwasi.salaryDebtBalance) + pendingDebt

    // Soft delete by setting status to TERMINATED and recording total debt
    await prisma.lokwasi.update({
      where: { id },
      data: {
        status: 'TERMINATED',
        terminatedDate: new Date(),
        salaryDebtBalance: totalDebtOwed,
        grossSalary: 0, // No future salary
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: 'DELETE_LOKWASI',
        entityType: 'lokwasi',
        entityId: lokwasi.id,
        oldValues: lokwasi as object,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting lokwasi:', error)
    return NextResponse.json(
      { error: 'Failed to delete lokwasi' },
      { status: 500 }
    )
  }
}
