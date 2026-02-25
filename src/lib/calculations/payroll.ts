/**
 * Payroll calculation utilities for Devalok
 *
 * TDS Calculation: CEILING(grossAmount * tdsRate / 100, 1)
 * Net Amount: grossAmount + leaveCashout + debtPayout - tdsAmount
 */

/**
 * Calculate TDS with ceiling to nearest rupee
 */
export function calculateTds(amount: number, tdsRate: number): number {
  return Math.ceil(amount * tdsRate / 100)
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
