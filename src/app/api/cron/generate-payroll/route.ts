import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/cron/generate-payroll
 * Automatically generates pending payroll runs for any overdue pay periods.
 * Protected by CRON_SECRET environment variable (used by Vercel Cron).
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const schedule = await prisma.payrollSchedule.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!schedule) {
      return NextResponse.json({ message: 'No active payroll schedule', generated: 0 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if there are any overdue payrolls
    if (new Date(schedule.nextPayrollDate) > today) {
      return NextResponse.json({ message: 'No overdue payrolls', generated: 0 })
    }

    // Get existing payroll runs to avoid duplicates
    const existingRuns = await prisma.payrollRun.findMany({
      select: { runDate: true },
    })
    const existingDates = new Set(
      existingRuns.map((r) => r.runDate.toISOString().split('T')[0])
    )

    // Get all lokwasis (including recently terminated)
    const allLokwasis = await prisma.lokwasi.findMany({
      where: { status: { in: ['ACTIVE', 'TERMINATED'] } },
    })

    if (allLokwasis.length === 0) {
      return NextResponse.json({ message: 'No employees found', generated: 0 })
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

      currentDate.setDate(currentDate.getDate() + schedule.cycleDays)
    }

    if (pendingPayrolls.length === 0) {
      return NextResponse.json({ message: 'No pending payrolls to generate', generated: 0 })
    }

    // Generate payroll runs
    const createdRuns = []

    for (const payroll of pendingPayrolls) {
      // Filter lokwasis eligible for this pay period
      const eligibleLokwasis = allLokwasis.filter((l) => {
        if (new Date(l.joinedDate) > payroll.runDate) return false
        if (l.status === 'ACTIVE') return true
        if (l.status === 'TERMINATED' && l.terminatedDate) {
          return new Date(l.terminatedDate) > payroll.periodStart
        }
        return false
      })

      if (eligibleLokwasis.length === 0) continue

      let totalGross = 0
      let totalTds = 0
      let totalNet = 0

      const paymentRecords = eligibleLokwasis.map((lokwasi, index) => {
        const gross = Number(lokwasi.grossSalary)
        const tdsRate = Number(lokwasi.tdsRate)
        const tds = Math.ceil(gross * tdsRate / 100)
        const netBeforeRecovery = gross - tds

        // Account recovery: if balance is negative (lokwasi owes company), deduct from net pay
        const accountBalance = Number(lokwasi.accountBalance)
        let accountDebitAmount = 0
        if (accountBalance < 0) {
          const amountOwed = Math.abs(accountBalance)
          accountDebitAmount = Math.min(amountOwed, netBeforeRecovery)
        }

        const net = netBeforeRecovery - accountDebitAmount

        totalGross += gross
        totalTds += tds
        totalNet += net

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
          accountDebitAmount,
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

      await prisma.auditLog.create({
        data: {
          action: 'AUTO_GENERATE_PAYROLL',
          entityType: 'payroll_run',
          entityId: run.id,
          newValues: {
            runDate: run.runDate,
            employeeCount: run.employeeCount,
            totalNet: Number(run.totalNet),
            source: 'cron',
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
    console.error('Cron: Error generating payrolls:', error)
    return NextResponse.json(
      { error: 'Failed to generate payrolls' },
      { status: 500 }
    )
  }
}
