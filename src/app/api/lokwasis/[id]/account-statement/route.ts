import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/lokwasis/[id]/account-statement - Get account transaction history
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
      select: {
        id: true,
        name: true,
        employeeCode: true,
        accountBalance: true,
        salaryDebtBalance: true,
      },
    })

    if (!lokwasi) {
      return NextResponse.json({ error: 'Lokwasi not found' }, { status: 404 })
    }

    const transactions = await prisma.accountTransaction.findMany({
      where: { lokwasiId: id },
      orderBy: { transactionDate: 'desc' },
      take: 100,
    })

    const data = transactions.map((t) => ({
      ...t,
      amount: Number(t.amount),
      balanceAfter: Number(t.balanceAfter),
      tdsRate: t.tdsRate ? Number(t.tdsRate) : null,
      tdsAmount: t.tdsAmount ? Number(t.tdsAmount) : null,
    }))

    return NextResponse.json({
      lokwasi: {
        ...lokwasi,
        accountBalance: Number(lokwasi.accountBalance),
        salaryDebtBalance: Number(lokwasi.salaryDebtBalance),
      },
      transactions: data,
    })
  } catch (error) {
    console.error('Error fetching account statement:', error)
    return NextResponse.json(
      { error: 'Failed to fetch account statement' },
      { status: 500 }
    )
  }
}
