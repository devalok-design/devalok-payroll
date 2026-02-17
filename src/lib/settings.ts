import { prisma } from './prisma'

/**
 * Fetch the debit account number from settings
 * Falls back to default if not configured
 */
export async function getDebitAccount(): Promise<string> {
  const DEFAULT_DEBIT_ACCOUNT = '925020020822684' // Devalok's Axis Bank account

  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'debit_account' },
    })

    return (setting?.value as string) || DEFAULT_DEBIT_ACCOUNT
  } catch (error) {
    console.error('Error fetching debit account setting:', error)
    return DEFAULT_DEBIT_ACCOUNT
  }
}
