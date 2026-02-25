import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
  Plus,
  Calendar,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react'

async function getPayrollRuns() {
  return prisma.payrollRun.findMany({
    orderBy: { runDate: 'desc' },
    take: 50,
    include: {
      _count: { select: { payments: true } },
      createdBy: { select: { name: true } },
      processedBy: { select: { name: true } },
    },
  })
}

async function getPayrollSchedule() {
  return prisma.payrollSchedule.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })
}

export default async function PayrollPage() {
  const [payrollRuns, schedule] = await Promise.all([
    getPayrollRuns(),
    getPayrollSchedule(),
  ])

  const pendingRuns = payrollRuns.filter((r) => r.status === 'PENDING')
  const processedRuns = payrollRuns.filter((r) => r.status === 'PROCESSED')
  const paidRuns = payrollRuns.filter((r) => r.status === 'PAID')

  return (
    <>
      <Header title="Payroll" />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            {schedule && (
              <p className="text-sm text-muted-foreground">
                Next scheduled: {new Date(schedule.nextPayrollDate).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
          <Button asChild>
            <Link href="/payroll/new">
              <Plus className="w-4 h-4" />
              Off-Cycle Payroll
            </Link>
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="gap-0 rounded-none py-4 shadow-none">
            <CardContent className="p-4 pt-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                  Pending
                </span>
                <Clock className="w-4 h-4 text-warning" />
              </div>
              <p className="text-2xl font-semibold text-foreground mt-2">
                {pendingRuns.length}
              </p>
              <p className="text-xs text-muted-foreground">
                {pendingRuns.length > 0 ? 'Needs attention' : 'All clear'}
              </p>
            </CardContent>
          </Card>

          <Card className="gap-0 rounded-none py-4 shadow-none">
            <CardContent className="p-4 pt-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                  Processed
                </span>
                <Download className="w-4 h-4 text-info" />
              </div>
              <p className="text-2xl font-semibold text-foreground mt-2">
                {processedRuns.length}
              </p>
              <p className="text-xs text-muted-foreground">
                Awaiting bank confirmation
              </p>
            </CardContent>
          </Card>

          <Card className="gap-0 rounded-none py-4 shadow-none">
            <CardContent className="p-4 pt-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                  Paid This Month
                </span>
                <CheckCircle className="w-4 h-4 text-success" />
              </div>
              <p className="text-2xl font-semibold text-foreground mt-2">
                {paidRuns.filter((r) => {
                  const paidDate = r.paidAt ? new Date(r.paidAt) : null
                  if (!paidDate) return false
                  const now = new Date()
                  return (
                    paidDate.getMonth() === now.getMonth() &&
                    paidDate.getFullYear() === now.getFullYear()
                  )
                }).length}
              </p>
              <p className="text-xs text-muted-foreground">
                Completed runs
              </p>
            </CardContent>
          </Card>

          <Card className="gap-0 rounded-none py-4 shadow-none">
            <CardContent className="p-4 pt-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                  Total Paid MTD
                </span>
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-semibold text-foreground mt-2">
                {formatCurrency(
                  paidRuns
                    .filter((r) => {
                      const paidDate = r.paidAt ? new Date(r.paidAt) : null
                      if (!paidDate) return false
                      const now = new Date()
                      return (
                        paidDate.getMonth() === now.getMonth() &&
                        paidDate.getFullYear() === now.getFullYear()
                      )
                    })
                    .reduce((sum, r) => sum + Number(r.totalNet), 0)
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Month to date
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Payrolls Alert */}
        {pendingRuns.length > 0 && (
          <div className="mb-6 p-4 bg-warning-light border border-warning">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <div className="flex-1">
                <p className="font-medium text-warning">
                  {pendingRuns.length} payroll run{pendingRuns.length > 1 ? 's' : ''} pending
                </p>
                <p className="text-sm text-neutral-700 mt-1">
                  Click on a pending run to review and download Excel for bank processing
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payroll Runs Table */}
        <Card className="gap-0 rounded-none py-0 shadow-none overflow-hidden">
          <CardHeader className="px-6 py-4 border-b">
            <CardTitle className="text-sm">
              Payroll History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    Run Date
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    Pay Period
                  </TableHead>
                  <TableHead className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    Employees
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    Total Gross
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    TDS
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    Net Payout
                  </TableHead>
                  <TableHead className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    Paid At
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollRuns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-4 py-12 text-center">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No payroll runs yet</p>
                      <Link
                        href="/payroll/new"
                        className="mt-4 inline-block text-primary hover:underline"
                      >
                        Create your first payroll run
                      </Link>
                    </TableCell>
                  </TableRow>
                ) : (
                  payrollRuns.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="px-4 py-4">
                        <Link
                          href={`/payroll/${run.id}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {new Date(run.runDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Link>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-sm text-muted-foreground">
                        {new Date(run.payPeriodStart).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        -{' '}
                        {new Date(run.payPeriodEnd).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-center text-sm text-foreground">
                        {run.employeeCount}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right text-sm text-foreground">
                        {formatCurrency(Number(run.totalGross))}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right text-sm text-muted-foreground">
                        {formatCurrency(Number(run.totalTds))}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right font-medium text-foreground">
                        {formatCurrency(Number(run.totalNet))}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-center">
                        <StatusBadge status={run.status} />
                      </TableCell>
                      <TableCell className="px-4 py-4 text-sm text-muted-foreground">
                        {run.paidAt
                          ? new Date(run.paidAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  )
}
