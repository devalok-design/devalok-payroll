import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/payroll/generate
 * Generates pending payroll runs for any overdue pay periods
 * Based on the payroll schedule and current date
 */
export async function POST() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get the active payroll schedule
    const schedule = await prisma.payrollSchedule.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!schedule) {
      return NextResponse.json(
        { error: 'No active payroll schedule found' },
        { status: 400 }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get existing payroll runs to avoid duplicates
    const existingRuns = await prisma.payrollRun.findMany({
      select: { runDate: true },
    })
    const existingDates = new Set(
      existingRuns.map((r) => r.runDate.toISOString().split('T')[0])
    )

    // Get all active lokwasis
    const activeLokwasis = await prisma.lokwasi.findMany({
      where: { status: 'ACTIVE' },
    })

    if (activeLokwasis.length === 0) {
      return NextResponse.json(
        { error: 'No active employees found' },
        { status: 400 }
      )
    }

    // Calculate pending pay periods
    const pendingPayrolls: { runDate: Date; periodStart: Date; periodEnd: Date }[] = []
    let currentDate = new Date(schedule.nextPayrollDate)

    while (currentDate <= today) {
      const dateKey = currentDate.toISOString().split('T')[0]
      if (!existingDates.has(dateKey)) {
        const periodStart = new Date(currentDate)
        periodStart.setDate(periodStart.getDate() - schedule.cycleDays)

        pendingPayrolls.push({
          runDate: new Date(currentDate),
          periodStart,
          periodEnd: new Date(currentDate),
        })
      }

      // Move to next pay period
      currentDate.setDate(currentDate.getDate() + schedule.cycleDays)
    }

    if (pendingPayrolls.length === 0) {
      return NextResponse.json({
        message: 'No pending payrolls to generate',
        generated: 0,
      })
    }

    // Generate payroll runs
    const createdRuns = []

    for (const payroll of pendingPayrolls) {
      // Filter lokwasis who had joined by the run date
      const eligibleLokwasis = activeLokwasis.filter(
        (l) => new Date(l.joinedDate) <= payroll.runDate
      )

      if (eligibleLokwasis.length === 0) continue

      // Calculate payments
      let totalGross = 0
      let totalTds = 0
      let totalNet = 0

      const paymentRecords = eligibleLokwasis.map((lokwasi, index) => {
        const gross = Number(lokwasi.grossSalary)
        const tdsRate = Number(lokwasi.tdsRate)
        const tds = Math.ceil(gross * tdsRate / 100)
        const net = gross - tds

        totalGross += gross
        totalTds += tds
        totalNet += net

        // Generate customer reference
        const yyyy = payroll.runDate.getFullYear()
        const mm = String(payroll.runDate.getMonth() + 1).padStart(2, '0')
        const dd = String(payroll.runDate.getDate()).padStart(2, '0')
        const ref = `DVLK-${yyyy}${mm}${dd}-${String(index + 1).padStart(3, '0')}`

        return {
          lokwasiId: lokwasi.id,
          grossAmount: gross,
          tdsRate: tdsRate,
          tdsAmount: tds,
          leaveCashoutDays: 0,
          leaveCashoutAmount: 0,
          debtPayoutAmount: 0,
          netAmount: net,
          customerReference: ref,
          snapshotPan: lokwasi.pan || '',
          snapshotAadhaar: lokwasi.aadhaar || '',
          snapshotBankAccount: lokwasi.bankAccount || '',
          snapshotIfsc: lokwasi.ifscCode || '',
          snapshotBankName: lokwasi.bankName || '',
          snapshotIsAxisBank: lokwasi.isAxisBank,
        }
      })

      // Create the payroll run
      const run = await prisma.payrollRun.create({
        data: {
          runDate: payroll.runDate,
          payPeriodStart: payroll.periodStart,
          payPeriodEnd: payroll.periodEnd,
          status: 'PENDING',
          totalGross,
          totalTds,
          totalNet,
          totalDebtPayout: 0,
          totalLeaveCashout: 0,
          employeeCount: paymentRecords.length,
          createdById: session.user.id,
          payments: {
            create: paymentRecords,
          },
        },
      })

      createdRuns.push({
        id: run.id,
        runDate: run.runDate,
        employeeCount: run.employeeCount,
        totalNet: Number(run.totalNet),
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'AUTO_GENERATE_PAYROLL',
          entityType: 'payroll_run',
          entityId: run.id,
          newValues: {
            runDate: run.runDate,
            employeeCount: run.employeeCount,
            totalNet: Number(run.totalNet),
          },
        },
      })
    }

    // Update the schedule's next payroll date
    if (createdRuns.length > 0) {
      const lastCreatedDate = new Date(
        Math.max(...createdRuns.map((r) => new Date(r.runDate).getTime()))
      )
      const nextDate = new Date(lastCreatedDate)
      nextDate.setDate(nextDate.getDate() + schedule.cycleDays)

      await prisma.payrollSchedule.update({
        where: { id: schedule.id },
        data: { nextPayrollDate: nextDate },
      })
    }

    return NextResponse.json({
      message: `Generated ${createdRuns.length} payroll run(s)`,
      generated: createdRuns.length,
      payrollRuns: createdRuns,
    })
  } catch (error) {
    console.error('Error generating payrolls:', error)
    return NextResponse.json(
      { error: 'Failed to generate payrolls' },
      { status: 500 }
    )
  }
}
