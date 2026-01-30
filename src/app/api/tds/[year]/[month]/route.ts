import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/tds/[year]/[month] - Get TDS data for a specific month
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { year, month } = await params
  const yearNum = parseInt(year)
  const monthNum = parseInt(month)

  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 })
  }

  try {
    const records = await prisma.tdsMonthly.findMany({
      where: {
        year: yearNum,
        month: monthNum,
      },
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
      orderBy: {
        lokwasi: { name: 'asc' },
      },
    })

    if (records.length === 0) {
      return NextResponse.json({ error: 'No TDS data for this month' }, { status: 404 })
    }

    // Calculate totals
    const totals = records.reduce(
      (acc, r) => ({
        totalGross: acc.totalGross + Number(r.totalGross),
        totalTds: acc.totalTds + Number(r.totalTds),
        totalNet: acc.totalNet + Number(r.totalNet),
        employeeCount: acc.employeeCount + 1,
      }),
      { totalGross: 0, totalTds: 0, totalNet: 0, employeeCount: 0 }
    )

    // Transform Decimal to number for JSON
    const transformedRecords = records.map((r) => ({
      ...r,
      totalGross: Number(r.totalGross),
      totalTds: Number(r.totalTds),
      totalNet: Number(r.totalNet),
      interestAmount: Number(r.interestAmount),
      totalTdsPayable: Number(r.totalTdsPayable),
    }))

    return NextResponse.json({
      year: yearNum,
      month: monthNum,
      records: transformedRecords,
      totals,
    })
  } catch (error) {
    console.error('Error fetching TDS data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch TDS data' },
      { status: 500 }
    )
  }
}

// PATCH /api/tds/[year]/[month] - Update all TDS records for a month
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { year, month } = await params
  const yearNum = parseInt(year)
  const monthNum = parseInt(month)

  try {
    const body = await request.json()
    const { status, challanNumber, paidDate, filedDate } = body

    const updateData: {
      filingStatus?: string
      challanNumber?: string
      paidDate?: Date
      filedDate?: Date
    } = {}

    if (status) {
      updateData.filingStatus = status
      if (status === 'FILED' && !filedDate) {
        updateData.filedDate = new Date()
      }
      if (status === 'PAID' && !paidDate) {
        updateData.paidDate = new Date()
      }
    }
    if (challanNumber) updateData.challanNumber = challanNumber
    if (paidDate) updateData.paidDate = new Date(paidDate)
    if (filedDate) updateData.filedDate = new Date(filedDate)

    await prisma.tdsMonthly.updateMany({
      where: {
        year: yearNum,
        month: monthNum,
      },
      data: updateData,
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_TDS_STATUS',
        entityType: 'tds_monthly',
        entityId: `${yearNum}-${monthNum}`,
        newValues: updateData,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating TDS data:', error)
    return NextResponse.json(
      { error: 'Failed to update TDS data' },
      { status: 500 }
    )
  }
}
