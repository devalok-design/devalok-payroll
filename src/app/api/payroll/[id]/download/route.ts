import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateAxisExcel, formatAxisDate } from '@/lib/excel/axis-template'
import { generateNEFTExcel, formatNEFTDate } from '@/lib/excel/neft-template'

// Default debit account (should come from settings in production)
const DEBIT_ACCOUNT = '923020036498498' // Devalok's Axis Bank account

// GET /api/payroll/[id]/download?type=axis|neft
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type') || 'axis'

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
                beneficiaryNickname: true,
                isAxisBank: true,
              },
            },
          },
        },
      },
    })

    if (!payrollRun) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
    }

    const runDate = new Date(payrollRun.runDate)
    let buffer: Buffer
    let filename: string

    if (type === 'axis') {
      // Filter Axis Bank payments only
      const axisPayments = payrollRun.payments.filter((p) => p.snapshotIsAxisBank)

      if (axisPayments.length === 0) {
        return NextResponse.json(
          { error: 'No Axis Bank payments in this payroll run' },
          { status: 400 }
        )
      }

      const paymentData = axisPayments.map((p) => ({
        debitAccountNumber: DEBIT_ACCOUNT,
        transactionAmount: Number(p.netAmount),
        transactionCurrency: 'INR',
        beneficiaryName: p.lokwasi.name,
        beneficiaryAccountNumber: p.snapshotBankAccount,
        transactionDate: formatAxisDate(runDate),
        customerReference: p.customerReference,
        beneficiaryCode: p.lokwasi.beneficiaryNickname,
      }))

      buffer = await generateAxisExcel(paymentData, DEBIT_ACCOUNT)
      filename = `devalok-axis-${runDate.toISOString().split('T')[0]}.xlsx`
    } else {
      // NEFT payments (non-Axis banks)
      const neftPayments = payrollRun.payments.filter((p) => !p.snapshotIsAxisBank)

      if (neftPayments.length === 0) {
        return NextResponse.json(
          { error: 'No NEFT payments in this payroll run' },
          { status: 400 }
        )
      }

      const paymentData = neftPayments.map((p) => ({
        debitAccountNumber: DEBIT_ACCOUNT,
        beneficiaryAccountNumber: p.snapshotBankAccount,
        transactionAmount: Number(p.netAmount),
        beneficiaryName: p.lokwasi.name,
        beneficiaryAddress1: 'India',
        beneficiaryAddress2: '',
        beneficiaryAddress3: '',
        beneficiaryAddress4: '',
        beneficiaryAddress5: '',
        instructionReference: p.customerReference,
        customerReference: p.customerReference,
        paymentMode: 'N', // NEFT
        beneficiaryIfsc: p.snapshotIfsc,
        beneficiaryBankName: p.snapshotBankName,
        beneficiaryBankBranch: '',
        beneficiaryEmail: '',
        beneficiaryMobile: '',
        remarks: `Salary ${runDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`,
        paymentDate: formatNEFTDate(runDate),
      }))

      buffer = await generateNEFTExcel(paymentData, DEBIT_ACCOUNT)
      filename = `devalok-neft-${runDate.toISOString().split('T')[0]}.xlsx`
    }

    // Convert Node.js Buffer to Uint8Array for proper BodyInit compatibility
    const uint8Array = new Uint8Array(buffer)

    return new Response(uint8Array, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating Excel:', error)
    return NextResponse.json(
      { error: 'Failed to generate Excel file' },
      { status: 500 }
    )
  }
}
