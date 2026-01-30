import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateTDSReportExcel } from '@/lib/excel/tds-report'

// GET /api/tds/[year]/[month]/download - Download TDS report Excel
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
            employeeCode: true,
            name: true,
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

    // Prepare report data
    const employees = records.map((r) => ({
      employeeCode: r.lokwasi.employeeCode,
      name: r.lokwasi.name,
      pan: r.lokwasi.pan,
      aadhaar: r.lokwasi.aadhaar,
      natureOfWork: r.lokwasi.natureOfWork,
      totalGross: Number(r.totalGross),
      totalTds: Number(r.totalTds),
      totalNet: Number(r.totalNet),
      paymentCount: r.paymentCount,
    }))

    const totals = employees.reduce(
      (acc, e) => ({
        totalGross: acc.totalGross + e.totalGross,
        totalTds: acc.totalTds + e.totalTds,
        totalNet: acc.totalNet + e.totalNet,
      }),
      { totalGross: 0, totalTds: 0, totalNet: 0 }
    )

    const report = {
      year: yearNum,
      month: monthNum,
      employees,
      totals,
    }

    const buffer = await generateTDSReportExcel(report)
    const filename = `devalok-tds-${yearNum}-${monthNum.toString().padStart(2, '0')}.xlsx`

    // Convert Node.js Buffer to Uint8Array for proper BodyInit compatibility
    const uint8Array = new Uint8Array(buffer)

    return new Response(uint8Array, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating TDS report:', error)
    return NextResponse.json(
      { error: 'Failed to generate TDS report' },
      { status: 500 }
    )
  }
}
