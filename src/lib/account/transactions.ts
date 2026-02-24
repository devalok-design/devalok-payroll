/**
 * Account transaction utilities for the lokwasi account ledger.
 *
 * Account balance semantics:
 *   positive = company owes lokwasi (salary debt, bonuses due)
 *   negative = lokwasi owes company (advances, loans)
 *
 * CREDIT transactions increase the balance (company owes more).
 * DEBIT transactions decrease the balance (recovery from payroll, etc.).
 */

import { Prisma, AccountTransactionType, AccountCategory } from '@prisma/client'

export interface CreateTransactionInput {
  lokwasiId: string
  type: AccountTransactionType
  category: AccountCategory
  amount: number // Always positive
  description: string
  isTaxable?: boolean
  tdsRate?: number
  tdsAmount?: number
  paymentId?: string
  manualPaymentId?: string
  transactionDate: Date
  createdById?: string
  notes?: string
}

/**
 * Create an account transaction and atomically update the lokwasi's account balance.
 * Must be called within a Prisma transaction (tx).
 */
export async function createAccountTransaction(
  tx: Prisma.TransactionClient,
  input: CreateTransactionInput
): Promise<{ balanceAfter: number }> {
  const { lokwasiId, type, amount } = input

  if (amount < 0) {
    throw new Error('Transaction amount must be positive')
  }

  // Calculate balance change: CREDIT adds, DEBIT subtracts
  const balanceChange = type === 'CREDIT' ? amount : -amount

  // Atomically update the account balance
  const updatedLokwasi = await tx.lokwasi.update({
    where: { id: lokwasiId },
    data: {
      accountBalance: { increment: balanceChange },
    },
    select: { accountBalance: true },
  })

  const balanceAfter = Number(updatedLokwasi.accountBalance)

  // Create the transaction record
  await tx.accountTransaction.create({
    data: {
      lokwasiId,
      type,
      category: input.category,
      amount: input.amount,
      balanceAfter,
      description: input.description,
      isTaxable: input.isTaxable ?? false,
      tdsRate: input.tdsRate,
      tdsAmount: input.tdsAmount,
      paymentId: input.paymentId,
      manualPaymentId: input.manualPaymentId,
      transactionDate: input.transactionDate,
      createdById: input.createdById,
      notes: input.notes,
    },
  })

  return { balanceAfter }
}

/**
 * Calculate the recovery amount from a lokwasi's next payroll payment.
 * Policy: 100% recovery - deduct entire advance from next payroll
 * (if sufficient net pay available after TDS).
 *
 * @param accountBalance - Current account balance (negative = owes company)
 * @param netPayBeforeRecovery - Net pay amount before any recovery deduction
 * @returns The amount to deduct from net pay
 */
export function calculateRecoveryAmount(
  accountBalance: number,
  netPayBeforeRecovery: number
): number {
  // Only recover if balance is negative (lokwasi owes company)
  if (accountBalance >= 0) return 0

  const amountOwed = Math.abs(accountBalance)

  // Recover 100% up to the available net pay (can't go below zero net)
  return Math.min(amountOwed, netPayBeforeRecovery)
}

/**
 * Generate customer reference for manual payment.
 * Format: MAN-YYYYMMDD-XXX
 */
export function generateManualPaymentReference(
  date: Date,
  sequenceNumber: number
): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const seq = sequenceNumber.toString().padStart(3, '0')
  return `MAN-${year}${month}${day}-${seq}`
}
