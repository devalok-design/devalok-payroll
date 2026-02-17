import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateAxisExcel, formatAxisDate } from '@/lib/excel/axis-template'
import { generateNEFTExcel, formatNEFTDate } from '@/lib/excel/neft-template'
import { getDebitAccount } from '@/lib/settings'

// GET /api/debt-runs/[id]/download?type=axis|neft
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
    // Fetch debit account from settings
    const DEBIT_ACCOUNT = await getDebitAccount()

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
                beneficiaryNickname: true,
                isAxisBank: true,
              },
            },
          },
        },
      },
    })

    if (!debtRun) {
      return NextResponse.json({ error: 'Debt run not found' }, { status: 404 })
    }

    const runDate = new Date(debtRun.runDate)
    const today = new Date() // Use current date for transaction date
    let buffer: Buffer
    let filename: string

    if (type === 'axis') {
      // Filter Axis Bank payments only
      const axisPayments = debtRun.debtPayments.filter((p) => p.snapshotIsAxisBank)

      if (axisPayments.length === 0) {
        return NextResponse.json(
          { error: 'No Axis Bank payments in this debt run' },
          { status: 400 }
        )
      }

      const paymentData = axisPayments.map((p) => ({
        debitAccountNumber: DEBIT_ACCOUNT,
        transactionAmount: Number(p.netAmount),
        transactionCurrency: 'INR',
        beneficiaryName: p.lokwasi.name,
        beneficiaryAccountNumber: p.snapshotBankAccount!,
        transactionDate: formatAxisDate(today),
        customerReference: p.customerReference!,
        beneficiaryCode: p.lokwasi.beneficiaryNickname,
      }))

      buffer = await generateAxisExcel(paymentData, DEBIT_ACCOUNT)
      filename = `devalok-debt-axis-${runDate.toISOString().split('T')[0]}.xlsx`
    } else {
      // NEFT payments (non-Axis banks)
      const neftPayments = debtRun.debtPayments.filter((p) => !p.snapshotIsAxisBank)

      if (neftPayments.length === 0) {
        return NextResponse.json(
          { error: 'No NEFT payments in this debt run' },
          { status: 400 }
        )
      }

      const paymentData = neftPayments.map((p) => ({
        debitAccountNumber: DEBIT_ACCOUNT,
        transactionAmount: Number(p.netAmount),
        transactionCurrency: 'INR',
        beneficiaryName: p.lokwasi.name,
        beneficiaryAccountNumber: p.snapshotBankAccount!,
        beneficiaryIfsc: p.snapshotIfsc!,
        transactionDate: formatNEFTDate(today),
        paymentMode: 'N', // NEFT
        customerReference: p.customerReference!,
        beneficiaryNickname: p.lokwasi.beneficiaryNickname,
        creditNarration: `Debt Payout ${runDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`,
      }))

      buffer = await generateNEFTExcel(paymentData, DEBIT_ACCOUNT)
      filename = `devalok-debt-neft-${runDate.toISOString().split('T')[0]}.xlsx`
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
