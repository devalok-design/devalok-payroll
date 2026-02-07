import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import {
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileText,
  AlertTriangle,
} from 'lucide-react'

async function getTdsData() {
  // Get TDS records grouped by year and month
  const tdsRecords = await prisma.tdsMonthly.groupBy({
    by: ['year', 'month', 'filingStatus'],
    _sum: {
      totalGross: true,
      totalTds: true,
      totalNet: true,
      totalTdsPayable: true,
    },
    _count: true,
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })

  // Group by year-month
  const monthlyData = new Map<string, {
    year: number
    month: number
    totalGross: number
    totalTds: number
    totalNet: number
    employeeCount: number
    filingStatuses: Map<string, number>
    primaryStatus: string
  }>()

  tdsRecords.forEach((record) => {
    const key = `${record.year}-${record.month}`
    const existing = monthlyData.get(key)

    if (existing) {
      existing.totalGross += Number(record._sum.totalGross || 0)
      existing.totalTds += Number(record._sum.totalTds || 0)
      existing.totalNet += Number(record._sum.totalNet || 0)
      existing.employeeCount += record._count
      existing.filingStatuses.set(
        record.filingStatus,
        (existing.filingStatuses.get(record.filingStatus) || 0) + record._count
      )
    } else {
      const statuses = new Map<string, number>()
      statuses.set(record.filingStatus, record._count)
      monthlyData.set(key, {
        year: record.year,
        month: record.month,
        totalGross: Number(record._sum.totalGross || 0),
        totalTds: Number(record._sum.totalTds || 0),
        totalNet: Number(record._sum.totalNet || 0),
        employeeCount: record._count,
        filingStatuses: statuses,
        primaryStatus: record.filingStatus,
      })
    }
  })

  // Determine primary status for each month
  monthlyData.forEach((data) => {
    // Priority: PENDING > WAITING_FOR_FILING > FILED > PAID
    const priorities = ['PENDING', 'WAITING_FOR_FILING', 'FILED', 'PAID']
    for (const status of priorities) {
      if (data.filingStatuses.has(status)) {
        data.primaryStatus = status
        break
      }
    }
  })

  return Array.from(monthlyData.values())
}

function getStatusBadge(status: string) {
  const styles: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
    PENDING: {
      bg: 'bg-[var(--warning-light)]',
      text: 'text-[var(--warning)]',
      icon: Clock,
    },
    WAITING_FOR_FILING: {
      bg: 'bg-[var(--info-light)]',
      text: 'text-[var(--info)]',
      icon: FileText,
    },
    FILED: {
      bg: 'bg-[var(--devalok-100)]',
      text: 'text-[var(--primary)]',
      icon: CheckCircle,
    },
    PAID: {
      bg: 'bg-[var(--success-light)]',
      text: 'text-[var(--success)]',
      icon: CheckCircle,
    },
  }
  return styles[status] || styles.PENDING
}

export default async function TdsPage() {
  const monthlyData = await getTdsData()

  const pendingMonths = monthlyData.filter(
    (m) => m.primaryStatus === 'PENDING' || m.primaryStatus === 'WAITING_FOR_FILING'
  )
  const totalPendingTds = pendingMonths.reduce((sum, m) => sum + m.totalTds, 0)

  // Group by fiscal year (Apr-Mar)
  const fiscalYears = new Map<string, typeof monthlyData>()
  monthlyData.forEach((month) => {
    const fyStart = month.month >= 4 ? month.year : month.year - 1
    const fyLabel = `FY ${fyStart}-${(fyStart + 1).toString().slice(-2)}`
    const existing = fiscalYears.get(fyLabel) || []
    existing.push(month)
    fiscalYears.set(fyLabel, existing)
  })

  return (
    <>
      <Header title="TDS Management" />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)]">
                Pending TDS
              </span>
              <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />
            </div>
            <p className="text-2xl font-semibold text-[var(--warning)] mt-2">
              {formatCurrency(totalPendingTds)}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {pendingMonths.length} month(s) pending
            </p>
          </div>

          <div className="bg-white p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)]">
                Current FY TDS
              </span>
              <Calendar className="w-4 h-4 text-[var(--primary)]" />
            </div>
            <p className="text-2xl font-semibold text-[var(--foreground)] mt-2">
              {formatCurrency(
                monthlyData
                  .filter((m) => {
                    const now = new Date()
                    const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
                    const monthFyStart = m.month >= 4 ? m.year : m.year - 1
                    return monthFyStart === fyStart
                  })
                  .reduce((sum, m) => sum + m.totalTds, 0)
              )}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Total deducted
            </p>
          </div>

          <div className="bg-white p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)]">
                Filed
              </span>
              <CheckCircle className="w-4 h-4 text-[var(--success)]" />
            </div>
            <p className="text-2xl font-semibold text-[var(--foreground)] mt-2">
              {monthlyData.filter((m) => m.primaryStatus === 'FILED' || m.primaryStatus === 'PAID').length}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Months filed
            </p>
          </div>

          <div className="bg-white p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)]">
                Quick Action
              </span>
              <Download className="w-4 h-4 text-[var(--primary)]" />
            </div>
            {pendingMonths.length > 0 ? (
              <Link
                href={`/tds/${pendingMonths[0].year}/${pendingMonths[0].month}`}
                className="mt-2 inline-block text-sm font-medium text-[var(--primary)] hover:underline"
              >
                Export {new Date(pendingMonths[0].year, pendingMonths[0].month - 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} →
              </Link>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                No pending exports
              </p>
            )}
          </div>
        </div>

        {/* Pending Alert */}
        {pendingMonths.length > 0 && (
          <div className="mb-6 p-4 bg-[var(--warning-light)] border border-[var(--warning)]">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[var(--warning)]" />
              <div className="flex-1">
                <p className="font-medium text-[var(--warning)]">
                  {pendingMonths.length} month(s) with pending TDS
                </p>
                <p className="text-sm text-[var(--neutral-700)] mt-1">
                  Download the TDS report and share with your CA for filing
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TDS by Fiscal Year */}
        {Array.from(fiscalYears.entries()).map(([fyLabel, months]) => (
          <div key={fyLabel} className="bg-white border border-[var(--border)] mb-6">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                {fyLabel}
              </h2>
              <span className="text-sm text-[var(--muted-foreground)]">
                Total TDS: {formatCurrency(months.reduce((sum, m) => sum + m.totalTds, 0))}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                      Month
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                      Employees
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                      Total Gross
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                      TDS Deducted
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {months
                    .sort((a, b) => b.month - a.month)
                    .map((month) => {
                      const statusStyle = getStatusBadge(month.primaryStatus)
                      const StatusIcon = statusStyle.icon
                      return (
                        <tr
                          key={`${month.year}-${month.month}`}
                          className="hover:bg-[var(--muted)] transition-colors"
                        >
                          <td className="px-4 py-4">
                            <Link
                              href={`/tds/${month.year}/${month.month}`}
                              className="font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
                            >
                              {new Date(month.year, month.month - 1).toLocaleDateString('en-IN', {
                                month: 'long',
                                year: 'numeric',
                              })}
                            </Link>
                          </td>
                          <td className="px-4 py-4 text-center text-sm text-[var(--foreground)]">
                            {month.employeeCount}
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-[var(--foreground)]">
                            {formatCurrency(month.totalGross)}
                          </td>
                          <td className="px-4 py-4 text-right font-medium text-[var(--foreground)]">
                            {formatCurrency(month.totalTds)}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {month.primaryStatus.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <Link
                              href={`/tds/${month.year}/${month.month}`}
                              className="text-sm text-[var(--primary)] hover:underline"
                            >
                              View Details
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {monthlyData.length === 0 && (
          <div className="bg-white border border-[var(--border)] p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-[var(--muted-foreground)]" />
            <p className="text-[var(--muted-foreground)]">No TDS records yet</p>
            <p className="text-sm text-[var(--muted-foreground)] mt-2">
              TDS records will appear here after payroll runs are marked as paid
            </p>
          </div>
        )}
      </main>
    </>
  )
}
