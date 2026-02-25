import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireStaff } from '@/lib/rbac'

// POST /api/settings/schedule - Create or update payroll schedule
export async function POST(request: NextRequest) {
  const session = await auth()
  const rbacError = requireStaff(session)
  if (rbacError) return rbacError

  try {
    const body = await request.json()
    const { lastPayrollDate, cycleDays, generationTime } = body

    if (!lastPayrollDate) {
      return NextResponse.json(
        { error: 'Last payroll date is required' },
        { status: 400 }
      )
    }

    const lastDate = new Date(lastPayrollDate)
    const nextDate = new Date(lastDate)
    nextDate.setDate(nextDate.getDate() + (cycleDays || 14))

    // Deactivate existing schedules
    await prisma.payrollSchedule.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    })

    // Create new schedule
    const schedule = await prisma.payrollSchedule.create({
      data: {
        lastPayrollDate: lastDate,
        nextPayrollDate: nextDate,
        cycleDays: cycleDays || 14,
        generationTime: generationTime || '09:00',
        isActive: true,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: 'UPDATE_PAYROLL_SCHEDULE',
        entityType: 'payroll_schedule',
        entityId: schedule.id,
        newValues: {
          lastPayrollDate: schedule.lastPayrollDate,
          nextPayrollDate: schedule.nextPayrollDate,
          cycleDays: schedule.cycleDays,
          generationTime: schedule.generationTime,
        },
      },
    })

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error('Error saving schedule:', error)
    return NextResponse.json(
      { error: 'Failed to save schedule' },
      { status: 500 }
    )
  }
}
