import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireStaff } from '@/lib/rbac'
import { getDebitAccount } from '@/lib/settings'

// GET /api/settings - Get all settings
export async function GET() {
  const session = await auth()
  const rbacError = requireStaff(session)
  if (rbacError) return rbacError

  try {
    // Get payroll schedule
    const schedule = await prisma.payrollSchedule.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    // Get users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        lastLoginAt: true,
      },
      orderBy: { name: 'asc' },
    })

    // Get debit account from settings
    const debitAccount = await getDebitAccount()

    return NextResponse.json({
      schedule,
      users,
      debitAccount,
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}
