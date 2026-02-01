import { prisma } from '@/lib/prisma'
import { formatCurrency, daysBetween, getOverduePayrollDates } from '@/lib/utils'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Users,
  Wallet,
  Calendar,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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

  const activeLokwasisCount = await prisma.lokwasi.count({
    where: { status: 'ACTIVE' },
  })

  const totalDebt = await prisma.lokwasi.aggregate({
    _sum: { salaryDebtBalance: true },
    where: { status: 'ACTIVE' },
  })

  const recentPayrolls = await prisma.payrollRun.findMany({
    where: { status: { in: ['PAID', 'PROCESSED'] } },
    orderBy: { paidAt: 'desc' },
    take: 5,
  })

  const pendingTds = await prisma.tdsMonthly.groupBy({
    by: ['year', 'month'],
    where: { filingStatus: { in: ['PENDING', 'WAITING_FOR_FILING'] } },
    _sum: { totalTds: true },
  })

  let overduePayrolls: Date[] = []
  let daysSinceLastPayment = 0
  if (schedule) {
    overduePayrolls = getOverduePayrollDates(schedule.lastPayrollDate)
    daysSinceLastPayment = daysBetween(schedule.lastPayrollDate, new Date())
  }

  return {
    schedule,
    pendingPayrolls,
    activeLokwasisCount,
    totalDebt: Number(totalDebt._sum.salaryDebtBalance || 0),
    recentPayrolls,
    pendingTds,
    overduePayrolls,
    daysSinceLastPayment,
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()
  const isOverdue = data.daysSinceLastPayment > 14
  const isDueToday = data.daysSinceLastPayment === 14

  return (
    <main className="flex-1 overflow-y-auto p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your payroll system</p>
      </div>

      {/* Alert Banner for Overdue Payroll */}
      {(isOverdue || data.pendingPayrolls.length > 0) && (
        <Alert variant={isOverdue ? 'destructive' : 'default'} className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {isOverdue
              ? `Payroll is ${data.daysSinceLastPayment - 14} days overdue`
              : isDueToday
              ? 'Payroll is due today'
              : `${data.pendingPayrolls.length} pending payroll(s) to process`}
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {data.overduePayrolls.length > 0 &&
                `${data.overduePayrolls.length} payroll cycle(s) need to be generated`}
            </span>
            <Button asChild size="sm" variant={isOverdue ? 'destructive' : 'default'}>
              <Link href="/payroll/new">Process Now</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Payment Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Payment Status
            </CardTitle>
            {isOverdue ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : isDueToday ? (
              <Clock className="h-4 w-4 text-warning" />
            ) : (
              <CheckCircle className="h-4 w-4 text-success" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.daysSinceLastPayment} days</div>
            <p className="text-xs text-muted-foreground">since last payment</p>
            <Badge
              variant={isOverdue ? 'destructive' : isDueToday ? 'secondary' : 'default'}
              className="mt-2"
            >
              {isOverdue ? 'OVERDUE' : isDueToday ? 'DUE TODAY' : 'ON TRACK'}
            </Badge>
          </CardContent>
        </Card>

        {/* Active Lokwasis */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Lokwasis
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeLokwasisCount}</div>
            <p className="text-xs text-muted-foreground">team members</p>
            <Button variant="link" asChild className="mt-2 h-auto p-0 text-xs">
              <Link href="/lokwasis">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Pending Salary Debt */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Salary Debt
            </CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalDebt)}</div>
            <p className="text-xs text-muted-foreground">pending from transition</p>
            <Button variant="link" asChild className="mt-2 h-auto p-0 text-xs">
              <Link href="/debts">
                View details <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Pending Payrolls */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Payrolls
            </CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pendingPayrolls.length}</div>
            <p className="text-xs text-muted-foreground">to process</p>
            {data.pendingPayrolls.length > 0 && (
              <Button variant="link" asChild className="mt-2 h-auto p-0 text-xs">
                <Link href="/payroll/new">
                  Process now <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/payroll/new"
              className="flex items-center gap-3 p-3 rounded-sm border hover:bg-accent transition-colors"
            >
              <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-sm">
                <Download className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-medium">Run Payroll</p>
                <p className="text-sm text-muted-foreground">
                  Generate and download payment Excel
                </p>
              </div>
            </Link>

            <Link
              href="/tds"
              className="flex items-center gap-3 p-3 rounded-sm border hover:bg-accent transition-colors"
            >
              <div className="w-10 h-10 bg-devalok-800 flex items-center justify-center rounded-sm">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium">Download TDS Report</p>
                <p className="text-sm text-muted-foreground">Export monthly TDS for CA</p>
              </div>
            </Link>

            <Link
              href="/lokwasis/new"
              className="flex items-center gap-3 p-3 rounded-sm border hover:bg-accent transition-colors"
            >
              <div className="w-10 h-10 bg-muted-foreground flex items-center justify-center rounded-sm">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium">Add Lokwasi</p>
                <p className="text-sm text-muted-foreground">Add a new team member</p>
              </div>
            </Link>

            <GeneratePayrollsButton />
          </CardContent>
        </Card>

        {/* Recent Payrolls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Payrolls</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentPayrolls.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No payrolls processed yet
              </p>
            ) : (
              <div className="space-y-2">
                {data.recentPayrolls.map((payroll) => (
                  <Link
                    key={payroll.id}
                    href={`/payroll/${payroll.id}`}
                    className="flex items-center justify-between p-3 rounded-sm hover:bg-accent transition-colors"
                  >
                    <div>
                      <p className="font-medium">
                        {new Date(payroll.runDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {payroll.employeeCount} employees
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(Number(payroll.totalNet))}</p>
                      <Badge variant={payroll.status === 'PAID' ? 'default' : 'secondary'}>
                        {payroll.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
                <Button variant="link" asChild className="w-full mt-2">
                  <Link href="/payroll">View all payrolls</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending TDS */}
      {data.pendingTds.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Pending TDS Filings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.pendingTds.map((tds) => {
                const monthName = new Date(tds.year, tds.month - 1).toLocaleDateString('en-IN', {
                  month: 'short',
                  year: 'numeric',
                })
                return (
                  <Button key={`${tds.year}-${tds.month}`} variant="outline" asChild>
                    <Link href={`/tds/${tds.year}/${tds.month}`}>
                      {monthName} - {formatCurrency(Number(tds._sum.totalTds || 0))}
                    </Link>
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  )
}
