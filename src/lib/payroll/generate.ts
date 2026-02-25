import { prisma } from '@/lib/prisma'
import { Lokwasi, PayrollSchedule } from '@prisma/client'

interface PayPeriod {
  runDate: Date
  periodStart: Date
  periodEnd: Date
}

interface CreatedRun {
  id: string
  runDate: Date
  employeeCount: number
  totalNet: number
}

/**
 * Find all overdue pay periods that don't already have payroll runs.
 */
function findPendingPayPeriods(
  schedule: PayrollSchedule,
  existingDates: Set<string>,
  today: Date,
): PayPeriod[] {
  const pending: PayPeriod[] = []
  const currentDate = new Date(schedule.nextPayrollDate)

  while (currentDate <= today) {
    const dateKey = currentDate.toISOString().split('T')[0]
    if (!existingDates.has(dateKey)) {
      const periodStart = new Date(currentDate)
      periodStart.setDate(periodStart.getDate() - (schedule.cycleDays - 1))

      pending.push({
        runDate: new Date(currentDate),
        periodStart,
        periodEnd: new Date(currentDate),
      })
    }

    currentDate.setDate(currentDate.getDate() + schedule.cycleDays)
  }

  return pending
}

/**
 * Filter lokwasis eligible for a specific pay period.
 * Must have joined by the run date and be ACTIVE, or if TERMINATED,
 * terminated after the period started.
 */
function filterEligibleLokwasis(allLokwasis: Lokwasi[], payroll: PayPeriod): Lokwasi[] {
  return allLokwasis.filter((l) => {
    if (new Date(l.joinedDate) > payroll.runDate) return false
    if (l.status === 'ACTIVE') return true
    if (l.status === 'TERMINATED' && l.terminatedDate) {
      return new Date(l.terminatedDate) > payroll.periodStart
    }
    return false
  })
}

/**
 * Build payment records for eligible lokwasis in a pay period.
 */
function buildPaymentRecords(eligibleLokwasis: Lokwasi[], runDate: Date) {
  let totalGross = 0
  let totalTds = 0
  let totalNet = 0

  const records = eligibleLokwasis.map((lokwasi, index) => {
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

    const yyyy = runDate.getFullYear()
    const mm = String(runDate.getMonth() + 1).padStart(2, '0')
    const dd = String(runDate.getDate()).padStart(2, '0')
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

  return { records, totalGross, totalTds, totalNet }
}

/**
 * Generate pending payroll runs for all overdue pay periods.
 * Shared by both the manual generate endpoint and the cron job.
 *
 * @param createdById - User ID if triggered manually (undefined for cron)
 * @param auditSource - 'manual' or 'cron' for audit log tracking
 */
export async function generatePendingPayrolls(
  createdById?: string,
  auditSource: 'manual' | 'cron' = 'manual',
): Promise<{ generated: number; payrollRuns: CreatedRun[]; message: string }> {
  const schedule = await prisma.payrollSchedule.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!schedule) {
    return { generated: 0, payrollRuns: [], message: 'No active payroll schedule' }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (new Date(schedule.nextPayrollDate) > today) {
    return { generated: 0, payrollRuns: [], message: 'No overdue payrolls' }
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
    return { generated: 0, payrollRuns: [], message: 'No employees found' }
  }

  const pendingPayrolls = findPendingPayPeriods(schedule, existingDates, today)

  if (pendingPayrolls.length === 0) {
    return { generated: 0, payrollRuns: [], message: 'No pending payrolls to generate' }
  }

  // Generate payroll runs
  const createdRuns: CreatedRun[] = []

  for (const payroll of pendingPayrolls) {
    const eligibleLokwasis = filterEligibleLokwasis(allLokwasis, payroll)
    if (eligibleLokwasis.length === 0) continue

    const { records, totalGross, totalTds, totalNet } = buildPaymentRecords(
      eligibleLokwasis,
      payroll.runDate,
    )

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
        employeeCount: records.length,
        ...(createdById ? { createdById } : {}),
        payments: {
          create: records,
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
        ...(createdById ? { userId: createdById } : {}),
        action: 'AUTO_GENERATE_PAYROLL',
        entityType: 'payroll_run',
        entityId: run.id,
        newValues: {
          runDate: run.runDate,
          employeeCount: run.employeeCount,
          totalNet: Number(run.totalNet),
          source: auditSource,
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

  return {
    generated: createdRuns.length,
    payrollRuns: createdRuns,
    message: `Generated ${createdRuns.length} payroll run(s)`,
  }
}
