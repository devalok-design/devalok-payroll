import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireStaff, requireAdmin } from '@/lib/rbac'
import { calculateTds } from '@/lib/calculations/payroll'
import { createAccountTransaction, generateManualPaymentReference } from '@/lib/account/transactions'

// GET /api/manual-payments - List manual payments
export async function GET(request: NextRequest) {
  const session = await auth()
  const rbacError = requireStaff(session)
  if (rbacError) return rbacError

  const { searchParams } = new URL(request.url)
  const lokwasiId = searchParams.get('lokwasiId')

  try {
    const where = lokwasiId ? { lokwasiId } : {}
    const manualPayments = await prisma.manualPayment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        lokwasi: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
          },
        },
      },
    })

    const data = manualPayments.map((mp) => ({
      ...mp,
      grossAmount: Number(mp.grossAmount),
      tdsRate: Number(mp.tdsRate),
      tdsAmount: Number(mp.tdsAmount),
      netAmount: Number(mp.netAmount),
    }))

    return NextResponse.json({ manualPayments: data })
  } catch (error) {
    console.error('Error fetching manual payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch manual payments' },
      { status: 500 }
    )
  }
}

// POST /api/manual-payments - Create a manual payment (advance, bonus, reimbursement, etc.)
export async function POST(request: NextRequest) {
  const session = await auth()
  const rbacError = requireAdmin(session)
  if (rbacError) return rbacError

  try {
    const body = await request.json()
    const { lokwasiId, category, grossAmount, isTaxable, paymentDate, notes } = body

    // Validate required fields
    if (!lokwasiId || !category || !grossAmount || grossAmount <= 0) {
      return NextResponse.json(
        { error: 'lokwasiId, category, and a positive grossAmount are required' },
        { status: 400 }
      )
    }

    // Validate category
    const validCategories = ['ADVANCE_SALARY', 'BONUS', 'REIMBURSEMENT', 'LOAN_DISBURSEMENT', 'ADJUSTMENT']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      )
    }

    // Get lokwasi with bank details
    const lokwasi = await prisma.lokwasi.findUnique({
      where: { id: lokwasiId },
    })

    if (!lokwasi) {
      return NextResponse.json({ error: 'Lokwasi not found' }, { status: 404 })
    }

    // Calculate TDS if taxable
    const tdsRate = isTaxable ? Number(lokwasi.tdsRate) : 0
    const tdsAmount = isTaxable ? calculateTds(grossAmount, tdsRate) : 0
    const netAmount = grossAmount - tdsAmount

    const dateObj = paymentDate ? new Date(paymentDate) : new Date()

    // Get sequence number for reference
    const todayStart = new Date(dateObj)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(dateObj)
    todayEnd.setHours(23, 59, 59, 999)

    const existingCount = await prisma.manualPayment.count({
      where: {
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    })

    const customerReference = generateManualPaymentReference(dateObj, existingCount + 1)

    // Create manual payment and account transaction in a single transaction
    const manualPayment = await prisma.$transaction(async (tx) => {
      // Create the manual payment record
      const mp = await tx.manualPayment.create({
        data: {
          lokwasiId,
          category,
          grossAmount,
          tdsRate,
          tdsAmount,
          netAmount,
          customerReference,
          paymentDate: dateObj,
          notes,
          createdById: session!.user.id,
          // Snapshot bank details
          snapshotBankAccount: lokwasi.bankAccount,
          snapshotIfsc: lokwasi.ifscCode,
          snapshotBankName: lokwasi.bankName,
          snapshotIsAxisBank: lokwasi.isAxisBank,
        },
        include: {
          lokwasi: {
            select: {
              id: true,
              name: true,
              employeeCode: true,
            },
          },
        },
      })

      // Determine transaction type based on category
      // Advances/Loans = DEBIT (employee will owe company after receiving money)
      // Bonuses/Reimbursements = CREDIT (company owes employee)
      const isDebit = category === 'ADVANCE_SALARY' || category === 'LOAN_DISBURSEMENT'
      const txType = isDebit ? 'DEBIT' : 'CREDIT'

      const categoryLabels: Record<string, string> = {
        ADVANCE_SALARY: 'Advance salary',
        BONUS: 'Bonus',
        REIMBURSEMENT: 'Reimbursement',
        LOAN_DISBURSEMENT: 'Loan disbursement',
        ADJUSTMENT: 'Manual adjustment',
      }

      // Create account transaction
      await createAccountTransaction(tx, {
        lokwasiId,
        type: txType,
        category,
        amount: grossAmount,
        description: `${categoryLabels[category] || category} - ${customerReference}`,
        isTaxable: isTaxable || false,
        tdsRate: isTaxable ? tdsRate : undefined,
        tdsAmount: isTaxable ? tdsAmount : undefined,
        manualPaymentId: mp.id,
        transactionDate: dateObj,
        createdById: session!.user.id,
        notes,
      })

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session!.user.id,
          action: 'CREATE_MANUAL_PAYMENT',
          entityType: 'manual_payment',
          entityId: mp.id,
          newValues: {
            lokwasiId,
            category,
            grossAmount,
            netAmount,
            customerReference,
          },
        },
      })

      return mp
    })

    return NextResponse.json({
      manualPayment: {
        ...manualPayment,
        grossAmount: Number(manualPayment.grossAmount),
        tdsRate: Number(manualPayment.tdsRate),
        tdsAmount: Number(manualPayment.tdsAmount),
        netAmount: Number(manualPayment.netAmount),
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating manual payment:', error)
    return NextResponse.json(
      { error: 'Failed to create manual payment' },
      { status: 500 }
    )
  }
}
