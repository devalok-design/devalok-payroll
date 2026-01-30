import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { lokwasiSchema } from '@/lib/validators/lokwasi'
import { z } from 'zod'

// GET /api/lokwasis - List all lokwasis
export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const lokwasis = await prisma.lokwasi.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ lokwasis })
  } catch (error) {
    console.error('Error fetching lokwasis:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lokwasis' },
      { status: 500 }
    )
  }
}

// POST /api/lokwasis - Create a new lokwasi
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validatedData = lokwasiSchema.parse(body)

    // Generate employee code
    const lastLokwasi = await prisma.lokwasi.findFirst({
      orderBy: { employeeCode: 'desc' },
    })

    let nextCode = 'LW001'
    if (lastLokwasi) {
      const lastNumber = parseInt(lastLokwasi.employeeCode.replace('LW', ''))
      nextCode = `LW${(lastNumber + 1).toString().padStart(3, '0')}`
    }

    // Create lokwasi
    const lokwasi = await prisma.lokwasi.create({
      data: {
        employeeCode: nextCode,
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
        initialLeaveBalance: validatedData.leaveBalance,
        salaryDebtBalance: validatedData.salaryDebtBalance,
        joinedDate: validatedData.joinedDate,
        status: validatedData.status,
        createdById: session.user.id,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_LOKWASI',
        entityType: 'lokwasi',
        entityId: lokwasi.id,
        newValues: lokwasi as object,
      },
    })

    return NextResponse.json({ lokwasi }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {}
      error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message
        }
      })
      return NextResponse.json({ errors }, { status: 400 })
    }

    console.error('Error creating lokwasi:', error)
    return NextResponse.json(
      { error: 'Failed to create lokwasi' },
      { status: 500 }
    )
  }
}
