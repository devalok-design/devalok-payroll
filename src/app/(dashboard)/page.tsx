import { prisma } from '@/lib/prisma'
import { formatCurrency, daysBetween } from '@/lib/utils'
import { getOverduePayrollDates } from '@/lib/calculations/payroll'
import {
  CheckCircle,
  Clock,
  Download,
  Users,
  Wallet,
  ArrowRight,
  FileText,
  Plus,
  CircleDot,
} from 'lucide-react'
import Link from 'next/link'
import { GeneratePayrollsButton } from '@/components/dashboard/GeneratePayrollsButton'

async function getDashboardData() {
  const schedule = await prisma.payrollSchedule.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  const pendingPayrolls = await prisma.payrollRun.findMany({
    where: { status: 'PENDING' },
    orderBy: { runDate: 'asc' },
    include: {
      _count: { select: { payments: true } },
    },
  })

  const processedPayrolls = await prisma.payrollRun.findMany({
    where: { status: 'PROCESSED' },
    orderBy: { runDate: 'asc' },
    include: {
      _count: { select: { payments: true } },
    },
  })

  const activeLokwasisCount = await prisma.lokwasi.count({
    where: { status: 'ACTIVE' },
  })

  // Total debt includes both active AND terminated lokwasis (terminated still owed money)
  const totalDebt = await prisma.lokwasi.aggregate({
    _sum: { salaryDebtBalance: true },
    where: { salaryDebtBalance: { gt: 0 } },
  })

  const recentPayrolls = await prisma.payrollRun.findMany({
    where: { status: 'PAID' },
    orderBy: { paidAt: 'desc' },
    take: 5,
  })

  const pendingTds = await prisma.tdsMonthly.groupBy({
    by: ['year', 'month'],
    where: { filingStatus: { in: ['PENDING', 'WAITING_FOR_FILING'] } },
    _sum: { totalTds: true },
  })

  // Bug fix: use actual paidAt from most recent PAID run, not schedule.lastPayrollDate
  const lastPaidRun = await prisma.payrollRun.findFirst({
    where: { status: 'PAID' },
    orderBy: { paidAt: 'desc' },
    select: { paidAt: true },
  })

  let overduePayrolls: Date[] = []
  if (schedule) {
    overduePayrolls = getOverduePayrollDates(schedule.lastPayrollDate, schedule.cycleDays)
  }

  // Days since last actual payment (not scheduled date)
  const daysSinceLastPayment = lastPaidRun?.paidAt
    ? daysBetween(lastPaidRun.paidAt, new Date())
    : schedule
    ? daysBetween(schedule.lastPayrollDate, new Date())
    : 0

  return {
    schedule,
    pendingPayrolls,
    processedPayrolls,
    activeLokwasisCount,
    totalDebt: Number(totalDebt._sum.salaryDebtBalance || 0),
    recentPayrolls,
    pendingTds,
    overduePayrolls,
    daysSinceLastPayment,
    nextPayrollDate: schedule?.nextPayrollDate || null,
  }
}

function formatDateShort(date: Date | string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

function formatDateFull(date: Date | string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const hasActionItems = data.pendingPayrolls.length > 0 || data.processedPayrolls.length > 0
  const cycleDays = data.schedule?.cycleDays || 14

  // Status dot color based on days since last payment
  const statusColor = data.daysSinceLastPayment > cycleDays
    ? 'bg-destructive'
    : data.daysSinceLastPayment >= cycleDays - 2
    ? 'bg-warning'
    : 'bg-success'

  return (
    <main className="flex-1 overflow-y-auto p-6">

      {/* Section A: Header + Payment Status */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusColor}`} />
            {data.daysSinceLastPayment === 0
              ? 'Paid today'
              : data.daysSinceLastPayment === 1
              ? 'Paid yesterday'
              : `Paid ${data.daysSinceLastPayment} days ago`}
          </span>
          {data.nextPayrollDate && (
            <>
              <span className="text-border">|</span>
              <span>
                Next: {formatDateFull(data.nextPayrollDate)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Silent auto-generation */}
      <GeneratePayrollsButton autoGenerate={data.overduePayrolls.length > 0} hidden />

      {/* Section B: Action Required */}
      {hasActionItems ? (
        <div className="mb-6">
          <h2 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-3">
            Action Required
          </h2>
          <div className="space-y-3">
            {/* Pending payrolls — need review & pay */}
            {data.pendingPayrolls.map((payroll) => {
              const periodStart = new Date(payroll.payPeriodStart)
              const periodEnd = new Date(payroll.payPeriodEnd)
              return (
                <Link
                  key={payroll.id}
                  href={`/payroll/${payroll.id}`}
                  className="flex items-center justify-between p-4 bg-white border border-border rounded-sm hover:border-primary/50 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 flex items-center justify-center rounded-sm">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {formatDateShort(periodStart)} – {formatDateShort(periodEnd)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {payroll._count.payments} employees · {formatCurrency(Number(payroll.totalNet))} net
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                    Review & Pay <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              )
            })}

            {/* Processed payrolls — need confirmation */}
            {data.processedPayrolls.map((payroll) => {
              const periodStart = new Date(payroll.payPeriodStart)
              const periodEnd = new Date(payroll.payPeriodEnd)
              return (
                <Link
                  key={payroll.id}
                  href={`/payroll/${payroll.id}`}
                  className="flex items-center justify-between p-4 bg-white border border-warning/30 rounded-sm hover:border-warning/60 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-warning/10 flex items-center justify-center rounded-sm">
                      <FileText className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {formatDateShort(periodStart)} – {formatDateShort(periodEnd)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Excel downloaded · {formatCurrency(Number(payroll.totalNet))} net
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-medium text-warning group-hover:gap-2 transition-all">
                    Confirm Payment <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              )
            })}

            {/* Pending TDS inline */}
            {data.pendingTds.length > 0 && (
              <Link
                href="/tds"
                className="flex items-center justify-between p-4 bg-white border border-border rounded-sm hover:border-muted-foreground/30 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-sm">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {data.pendingTds.length} TDS filing{data.pendingTds.length > 1 ? 's' : ''} pending
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {data.pendingTds.map((tds) => {
                        const monthName = new Date(tds.year, tds.month - 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                        return monthName
                      }).join(', ')}
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-sm text-muted-foreground group-hover:gap-2 transition-all">
                  View <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-6 p-8 bg-devalok-50 border border-devalok-200 rounded-sm text-center">
          <CheckCircle className="w-8 h-8 text-devalok-400 mx-auto mb-2" />
          <p className="font-medium text-foreground">All <span className="text-primary">caught up</span></p>
          <p className="text-sm text-muted-foreground mt-1">No pending payrolls or actions required.</p>
        </div>
      )}

      {/* Section C: At a Glance */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 py-3 border-t border-b border-border text-sm">
        <Link href="/lokwasis" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <Users className="w-4 h-4" />
          <span><strong className="text-foreground">{data.activeLokwasisCount}</strong> Active Lokwasis</span>
        </Link>
        {data.totalDebt > 0 && (
          <Link href="/debts" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <Wallet className="w-4 h-4" />
            <span><strong className="text-foreground">{formatCurrency(data.totalDebt)}</strong> Salary Debt</span>
          </Link>
        )}
      </div>

      {/* Section D: Recent Payments + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Payments */}
        <div className="lg:col-span-2">
          <h2 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-3">
            Recent Payments
          </h2>
          {data.recentPayrolls.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No payments made yet.</p>
          ) : (
            <div className="space-y-0">
              {data.recentPayrolls.map((payroll, i) => (
                <Link
                  key={payroll.id}
                  href={`/payroll/${payroll.id}`}
                  className="flex items-center gap-4 py-3 hover:bg-accent/50 -mx-2 px-2 rounded-sm transition-colors"
                >
                  {/* Timeline dot + line */}
                  <div className="flex flex-col items-center">
                    <CircleDot className="w-4 h-4 text-primary shrink-0" />
                    {i < data.recentPayrolls.length - 1 && (
                      <div className="w-px h-4 bg-border mt-1" />
                    )}
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {formatDateFull(payroll.runDate)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payroll.employeeCount} employees
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(Number(payroll.totalNet))}
                    </p>
                  </div>
                </Link>
              ))}
              <Link
                href="/payroll"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
              >
                View all payrolls <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-3">
            Quick Actions
          </h2>
          <div className="space-y-2">
            <Link
              href="/payroll/new"
              className="flex items-center gap-3 p-3 rounded-sm border border-border hover:bg-accent transition-colors"
            >
              <Plus className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Off-Cycle Payroll</span>
            </Link>
            <Link
              href="/tds"
              className="flex items-center gap-3 p-3 rounded-sm border border-border hover:bg-accent transition-colors"
            >
              <Download className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Download TDS Report</span>
            </Link>
            <Link
              href="/lokwasis/new"
              className="flex items-center gap-3 p-3 rounded-sm border border-border hover:bg-accent transition-colors"
            >
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Add Lokwasi</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
