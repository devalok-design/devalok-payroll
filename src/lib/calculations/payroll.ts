/**
 * Payroll calculation utilities for Devalok
 *
 * TDS Calculation: CEILING(grossAmount * tdsRate / 100, 1)
 * Net Amount: grossAmount + leaveCashout + debtPayout - tdsAmount
 */

export interface PayrollInput {
  lokwasiId: string
  name: string
  grossSalary: number
  tdsRate: number
  leaveBalance: number
  salaryDebtBalance: number
  accountBalance: number // positive = company owes, negative = lokwasi owes
  leaveCashoutDays?: number
  debtPayoutAmount?: number
  // Bank details for payment generation
  bankAccount: string
  ifscCode: string
  bankName: string
  beneficiaryNickname: string
  isAxisBank: boolean
  pan: string
  aadhaar: string
}

export interface PayrollCalculation {
  lokwasiId: string
  name: string
  grossSalary: number
  tdsRate: number
  leaveCashoutDays: number
  leaveCashoutAmount: number
  debtPayoutAmount: number
  accountDebitAmount: number // Amount deducted to recover negative account balance
  totalGross: number // grossSalary + leaveCashout + debtPayout
  tdsAmount: number
  netAmount: number // Final net after TDS and account recovery
  // Bank details snapshot
  bankAccount: string
  ifscCode: string
  bankName: string
  beneficiaryNickname: string
  isAxisBank: boolean
  pan: string
  aadhaar: string
}

/**
 * Calculate TDS with ceiling to nearest rupee
 */
export function calculateTds(amount: number, tdsRate: number): number {
  return Math.ceil(amount * tdsRate / 100)
}

/**
 * Calculate daily salary rate based on pay cycle
 * @param cycledalary - Salary for one pay cycle
 * @param cycleDays - Number of days in the pay cycle (from payroll schedule)
 */
export function calculateDailySalary(cycleSalary: number, cycleDays: number): number {
  return cycleSalary / cycleDays
}

/**
 * Calculate leave cashout amount
 * Based on daily salary rate
 */
export function calculateLeaveCashout(
  cycleSalary: number,
  leaveDays: number,
  cycleDays: number
): number {
  const dailyRate = calculateDailySalary(cycleSalary, cycleDays)
  return Math.round(dailyRate * leaveDays * 100) / 100 // Round to 2 decimal places
}

/**
 * Calculate full payroll for a lokwasi
 */
export function calculatePayroll(input: PayrollInput, cycleDays: number): PayrollCalculation {
  const leaveCashoutDays = input.leaveCashoutDays || 0
  const leaveCashoutAmount = calculateLeaveCashout(input.grossSalary, leaveCashoutDays, cycleDays)
  const debtPayoutAmount = input.debtPayoutAmount || 0

  // TDS applies to all payments: salary, leave cashout, and debt payout
  const taxableAmount = input.grossSalary + leaveCashoutAmount + debtPayoutAmount
  const tdsAmount = calculateTds(taxableAmount, input.tdsRate)

  // Net before account recovery
  const netBeforeRecovery = taxableAmount - tdsAmount

  // Account recovery: if balance is negative, deduct from net pay (100% recovery)
  let accountDebitAmount = 0
  if (input.accountBalance < 0) {
    const amountOwed = Math.abs(input.accountBalance)
    accountDebitAmount = Math.min(amountOwed, netBeforeRecovery)
  }

  // Final net = net after TDS minus account recovery
  const netAmount = netBeforeRecovery - accountDebitAmount

  return {
    lokwasiId: input.lokwasiId,
    name: input.name,
    grossSalary: input.grossSalary,
    tdsRate: input.tdsRate,
    leaveCashoutDays,
    leaveCashoutAmount,
    debtPayoutAmount,
    accountDebitAmount,
    totalGross: taxableAmount + debtPayoutAmount,
    tdsAmount,
    netAmount,
    bankAccount: input.bankAccount,
    ifscCode: input.ifscCode,
    bankName: input.bankName,
    beneficiaryNickname: input.beneficiaryNickname,
    isAxisBank: input.isAxisBank,
    pan: input.pan,
    aadhaar: input.aadhaar,
  }
}

/**
 * Calculate payroll for multiple lokwasis
 */
export function calculateBulkPayroll(inputs: PayrollInput[]): {
  payments: PayrollCalculation[]
  totals: {
    totalGross: number
    totalTds: number
    totalNet: number
    totalLeaveCashout: number
    totalDebtPayout: number
    employeeCount: number
  }
} {
  const payments = inputs.map(calculatePayroll)

  const totals = payments.reduce(
    (acc, p) => ({
      totalGross: acc.totalGross + p.totalGross,
      totalTds: acc.totalTds + p.tdsAmount,
      totalNet: acc.totalNet + p.netAmount,
      totalLeaveCashout: acc.totalLeaveCashout + p.leaveCashoutAmount,
      totalDebtPayout: acc.totalDebtPayout + p.debtPayoutAmount,
      employeeCount: acc.employeeCount + 1,
    }),
    {
      totalGross: 0,
      totalTds: 0,
      totalNet: 0,
      totalLeaveCashout: 0,
      totalDebtPayout: 0,
      employeeCount: 0,
    }
  )

  return { payments, totals }
}

/**
 * Generate customer reference for payment
 * Format: DVLK-YYYYMMDD-XXX
 */
export function generateCustomerReference(
  date: Date,
  sequenceNumber: number
): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const seq = sequenceNumber.toString().padStart(3, '0')
  return `DVLK-${year}${month}${day}-${seq}`
}

/**
 * Generate customer reference for debt payment
 * Format: DEBT-YYYYMMDD-XXX
 */
export function generateDebtReference(
  date: Date,
  sequenceNumber: number
): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const seq = sequenceNumber.toString().padStart(3, '0')
  return `DEBT-${year}${month}${day}-${seq}`
}

/**
 * Get next payroll date based on last payroll date and cycle days
 * @param lastPayrollDate - The last payroll date
 * @param cycleDays - Number of days in pay cycle (from payroll schedule)
 */
export function getNextPayrollDate(lastPayrollDate: Date, cycleDays: number): Date {
  const next = new Date(lastPayrollDate)
  next.setDate(next.getDate() + cycleDays)
  return next
}

/**
 * Get all overdue payroll dates
 * Returns array of dates that should have been processed
 * @param lastPayrollDate - The last payroll date
 * @param cycleDays - Number of days in pay cycle (from payroll schedule)
 */
export function getOverduePayrollDates(lastPayrollDate: Date, cycleDays: number): Date[] {
  const overdue: Date[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let nextDate = getNextPayrollDate(lastPayrollDate, cycleDays)

  while (nextDate <= today) {
    overdue.push(new Date(nextDate))
    nextDate = getNextPayrollDate(nextDate, cycleDays)
  }

  return overdue
}

/**
 * Calculate pay period start and end dates
 * Pay period ends on run date, starts cycleDays before
 * @param runDate - The payroll run date
 * @param cycleDays - Number of days in pay cycle (from payroll schedule)
 */
export function getPayPeriod(runDate: Date, cycleDays: number): { start: Date; end: Date } {
  const end = new Date(runDate)
  end.setHours(23, 59, 59, 999)

  const start = new Date(runDate)
  start.setDate(start.getDate() - (cycleDays - 1)) // Period includes run date
  start.setHours(0, 0, 0, 0)

  return { start, end }
}
