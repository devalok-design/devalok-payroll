import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
          <Card className="gap-0 rounded-none py-4 shadow-none">
            <CardContent className="p-4 pt-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                  Pending TDS
                </span>
                <AlertTriangle className="w-4 h-4 text-warning" />
              </div>
              <p className="text-2xl font-semibold text-warning mt-2">
                {formatCurrency(totalPendingTds)}
              </p>
              <p className="text-xs text-muted-foreground">
                {pendingMonths.length} month(s) pending
              </p>
            </CardContent>
          </Card>

          <Card className="gap-0 rounded-none py-4 shadow-none">
            <CardContent className="p-4 pt-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                  Current FY TDS
                </span>
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-semibold text-foreground mt-2">
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
              <p className="text-xs text-muted-foreground">
                Total deducted
              </p>
            </CardContent>
          </Card>

          <Card className="gap-0 rounded-none py-4 shadow-none">
            <CardContent className="p-4 pt-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                  Filed
                </span>
                <CheckCircle className="w-4 h-4 text-success" />
              </div>
              <p className="text-2xl font-semibold text-foreground mt-2">
                {monthlyData.filter((m) => m.primaryStatus === 'FILED' || m.primaryStatus === 'PAID').length}
              </p>
              <p className="text-xs text-muted-foreground">
                Months filed
              </p>
            </CardContent>
          </Card>

          <Card className="gap-0 rounded-none py-4 shadow-none">
            <CardContent className="p-4 pt-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                  Quick Action
                </span>
                <Download className="w-4 h-4 text-primary" />
              </div>
              {pendingMonths.length > 0 ? (
                <Link
                  href={`/tds/${pendingMonths[0].year}/${pendingMonths[0].month}`}
                  className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                >
                  Export {new Date(pendingMonths[0].year, pendingMonths[0].month - 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} →
                </Link>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  No pending exports
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pending Alert */}
        {pendingMonths.length > 0 && (
          <div className="mb-6 p-4 bg-warning-light border border-warning">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <div className="flex-1">
                <p className="font-medium text-warning">
                  {pendingMonths.length} month(s) with pending TDS
                </p>
                <p className="text-sm text-neutral-700 mt-1">
                  Download the TDS report and share with your CA for filing
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TDS by Fiscal Year */}
        {Array.from(fiscalYears.entries()).map(([fyLabel, months]) => (
          <Card key={fyLabel} className="gap-0 rounded-none py-0 shadow-none mb-6 overflow-hidden">
            <CardHeader className="px-6 py-4 border-b flex-row items-center justify-between">
              <CardTitle className="text-sm">
                {fyLabel}
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                Total TDS: {formatCurrency(months.reduce((sum, m) => sum + m.totalTds, 0))}
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                      Month
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                      Employees
                    </TableHead>
                    <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                      Total Gross
                    </TableHead>
                    <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                      TDS Deducted
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {months
                    .sort((a, b) => b.month - a.month)
                    .map((month) => (
                      <TableRow key={`${month.year}-${month.month}`}>
                        <TableCell className="px-4 py-4">
                          <Link
                            href={`/tds/${month.year}/${month.month}`}
                            className="font-medium text-foreground hover:text-primary"
                          >
                            {new Date(month.year, month.month - 1).toLocaleDateString('en-IN', {
                              month: 'long',
                              year: 'numeric',
                            })}
                          </Link>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-center text-sm text-foreground">
                          {month.employeeCount}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-right text-sm text-foreground">
                          {formatCurrency(month.totalGross)}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-right font-medium text-foreground">
                          {formatCurrency(month.totalTds)}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-center">
                          <StatusBadge status={month.primaryStatus} />
                        </TableCell>
                        <TableCell className="px-4 py-4 text-center">
                          <Link
                            href={`/tds/${month.year}/${month.month}`}
                            className="text-sm text-primary hover:underline"
                          >
                            View Details
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}

        {monthlyData.length === 0 && (
          <Card className="gap-0 rounded-none py-0 shadow-none">
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No TDS records yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                TDS records will appear here after payroll runs are marked as paid
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  )
}
