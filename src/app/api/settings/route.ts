import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/settings - Get all settings
export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
    const debitAccountSetting = await prisma.setting.findUnique({
      where: { key: 'debit_account' },
    })

    return NextResponse.json({
      schedule,
      users,
      debitAccount: debitAccountSetting?.value || '923020036498498',
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}
