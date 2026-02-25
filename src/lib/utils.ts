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
