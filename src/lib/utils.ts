import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as Indian Rupees
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Calculate days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  d1.setHours(0, 0, 0, 0)
  d2.setHours(0, 0, 0, 0)
  return Math.round(Math.abs((d2.getTime() - d1.getTime()) / oneDay))
}

/**
 * Calculate TDS amount with ceiling to nearest rupee
 */
export function calculateTds(grossAmount: number, tdsRate: number): number {
  return Math.ceil(grossAmount * tdsRate / 100)
}

/**
 * Generate customer reference for bank transfers
 * Format: DVLK-YYYYMMDD-###
 */
export function generateCustomerReference(date: Date, sequenceNumber: number): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const seq = String(sequenceNumber).padStart(3, '0')
  return `DVLK-${year}${month}${day}-${seq}`
}

/**
 * Mask PAN number for display (show first 3 and last 2)
 */
export function maskPan(pan: string): string {
  if (pan.length !== 10) return pan
  return `${pan.slice(0, 3)}****${pan.slice(-2)}`
}

/**
 * Mask Aadhaar number for display (show last 4)
 */
export function maskAadhaar(aadhaar: string): string {
  if (aadhaar.length !== 12) return aadhaar
  return `****-****-${aadhaar.slice(-4)}`
}

/**
 * Mask bank account for display (show last 4)
 */
export function maskBankAccount(account: string): string {
  if (account.length < 4) return account
  return `****${account.slice(-4)}`
}

/**
 * Get overdue payroll dates based on last payroll date
 * Returns array of dates that should have been processed (every 14 days)
 */
export function getOverduePayrollDates(lastPayrollDate: Date): Date[] {
  const dates: Date[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let nextDate = new Date(lastPayrollDate)
  nextDate.setDate(nextDate.getDate() + 14)
  nextDate.setHours(0, 0, 0, 0)

  while (nextDate <= today) {
    dates.push(new Date(nextDate))
    nextDate.setDate(nextDate.getDate() + 14)
  }

  return dates
}

/**
 * Validate PAN format
 */
export function isValidPan(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)
}

/**
 * Validate Aadhaar format (12 digits)
 */
export function isValidAadhaar(aadhaar: string): boolean {
  return /^[0-9]{12}$/.test(aadhaar)
}

/**
 * Validate IFSC code format
 */
export function isValidIfsc(ifsc: string): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)
}

/**
 * Format date for display in Indian format
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Format date for Axis bank template (DD/MM/YYYY)
 */
export function formatDateForBank(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}
