import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Wallet,
  Users,
  Plus,
  ArrowRight,
} from 'lucide-react'

async function getDebtData() {
  // Get all lokwasis with debt balances
  const lokwasis = await prisma.lokwasi.findMany({
    where: {
      OR: [
        { salaryDebtBalance: { gt: 0 } },
        {
          debtPayments: {
            some: {},
          },
        },
      ],
    },
    orderBy: { salaryDebtBalance: 'desc' },
    include: {
      debtPayments: {
        orderBy: { paymentDate: 'desc' },
        take: 5,
      },
    },
  })

  // Get total debt paid (only actual repayments, not additions)
  const totalPaid = await prisma.debtPayment.aggregate({
    _sum: { amount: true },
    where: { isAddition: false },
  })

  // Get recent debt payments
  const recentPayments = await prisma.debtPayment.findMany({
    orderBy: { paymentDate: 'desc' },
    take: 10,
    include: {
      lokwasi: {
        select: {
          id: true,
          name: true,
          employeeCode: true,
        },
      },
    },
  })

  // Get recent debt runs
  const recentDebtRuns = await prisma.debtRun.findMany({
    orderBy: { runDate: 'desc' },
    take: 5,
    include: {
      _count: { select: { debtPayments: true } },
    },
  })

  return {
    lokwasis,
    totalPaid: Number(totalPaid._sum.amount || 0),
    recentPayments,
    recentDebtRuns,
  }
}

export default async function DebtsPage() {
  const data = await getDebtData()

  const totalOutstanding = data.lokwasis.reduce(
    (sum, l) => sum + Number(l.salaryDebtBalance),
    0
  )

  const lokwasisWithDebt = data.lokwasis.filter(
    (l) => Number(l.salaryDebtBalance) > 0
  )

  const lokwasisFullyPaid = data.lokwasis.filter(
    (l) => Number(l.salaryDebtBalance) === 0 && l.debtPayments.length > 0
  )

  return (
    <>
      <Header title="Salary Debts" />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/debts/runs"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              View all debt runs
              <ArrowRight className="w-3 h-3 inline ml-1" />
            </Link>
          </div>
          <Button asChild>
            <Link href="/debts/process">
              <Plus className="w-4 h-4" />
              Process Debt Payments
            </Link>
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="rounded-none py-0 gap-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                  Total Outstanding
                </span>
                <AlertTriangle className="w-4 h-4 text-warning" />
              </div>
              <p className="text-2xl font-semibold text-warning mt-2">
                {formatCurrency(totalOutstanding)}
              </p>
              <p className="text-xs text-muted-foreground">
                From proprietorship transition
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-none py-0 gap-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                  Total Repaid
                </span>
                <TrendingDown className="w-4 h-4 text-success" />
              </div>
              <p className="text-2xl font-semibold text-success mt-2">
                {formatCurrency(data.totalPaid)}
              </p>
              <p className="text-xs text-muted-foreground">
                Via payroll payouts
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-none py-0 gap-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                  Lokwasis with Debt
                </span>
                <Users className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-semibold text-foreground mt-2">
                {lokwasisWithDebt.length}
              </p>
              <p className="text-xs text-muted-foreground">
                With outstanding balance
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-none py-0 gap-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                  Fully Repaid
                </span>
                <CheckCircle className="w-4 h-4 text-success" />
              </div>
              <p className="text-2xl font-semibold text-foreground mt-2">
                {lokwasisFullyPaid.length}
              </p>
              <p className="text-xs text-muted-foreground">
                Debt cleared
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Info Box */}
        <Card className="rounded-none py-0 gap-0 bg-muted mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Wallet className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground">
                  About Salary Debts
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  These are pending salary amounts from when Devalok transitioned from a
                  sole proprietorship to a private limited company. Debt payouts can be
                  processed via standalone debt runs or included in regular payroll runs.
                  TDS is deducted from debt payouts and included in monthly TDS reports.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Debt by Employee */}
          <Card className="lg:col-span-2 rounded-none py-0 gap-0 overflow-hidden">
            <CardHeader className="border-b py-4 px-6">
              <h2 className="text-sm font-semibold text-foreground">
                Outstanding Balances
              </h2>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase">
                    Employee
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase">
                    Outstanding
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase">
                    Total Repaid
                  </TableHead>
                  <TableHead className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lokwasis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="px-4 py-12 text-center">
                      <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No salary debts recorded</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.lokwasis.map((lokwasi) => {
                    const outstanding = Number(lokwasi.salaryDebtBalance)
                    const totalRepaid = lokwasi.debtPayments.reduce(
                      (sum, p) => sum + Number(p.amount),
                      0
                    )
                    const isFullyPaid = outstanding === 0 && lokwasi.debtPayments.length > 0

                    return (
                      <TableRow key={lokwasi.id}>
                        <TableCell className="px-4 py-4">
                          <Link
                            href={`/lokwasis/${lokwasi.id}`}
                            className="font-medium text-foreground hover:text-primary"
                          >
                            {lokwasi.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {lokwasi.employeeCode}
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-right">
                          {outstanding > 0 ? (
                            <span className="font-semibold text-warning">
                              {formatCurrency(outstanding)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-right">
                          {totalRepaid > 0 ? (
                            <span className="text-success">
                              {formatCurrency(totalRepaid)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-center">
                          {isFullyPaid ? (
                            <Badge variant="success">
                              <CheckCircle className="w-3 h-3" />
                              CLEARED
                            </Badge>
                          ) : outstanding > 0 ? (
                            <Badge variant="warning">PENDING</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No debt
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Recent Payments */}
          <Card className="rounded-none py-0 gap-0">
            <CardHeader className="border-b py-4 px-6">
              <h2 className="text-sm font-semibold text-foreground">
                Recent Debt Payments
              </h2>
            </CardHeader>
            {data.recentPayments.length === 0 ? (
              <div className="p-6 text-center">
                <TrendingDown className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No debt payments yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="px-4 py-3 hover:bg-devalok-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {payment.lokwasi.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.paymentDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <span className="font-medium text-success">
                        {formatCurrency(Number(payment.amount))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
    </>
  )
}
