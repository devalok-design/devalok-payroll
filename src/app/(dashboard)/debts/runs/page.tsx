import Link from 'next/link'
import { Header } from '@/components/layout/Header'
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
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Wallet,
} from 'lucide-react'

async function getDebtRuns() {
  return prisma.debtRun.findMany({
    orderBy: { runDate: 'desc' },
    take: 50,
    include: {
      _count: { select: { debtPayments: true } },
      createdBy: { select: { name: true } },
      processedBy: { select: { name: true } },
    },
  })
}

export default async function DebtRunsPage() {
  const debtRuns = await getDebtRuns()

  const pendingRuns = debtRuns.filter((r) => r.status === 'PENDING')
  const processedRuns = debtRuns.filter((r) => r.status === 'PROCESSED')
  const paidRuns = debtRuns.filter((r) => r.status === 'PAID')

  return (
    <>
      <Header title="Debt Payment Runs" />

      <main className="flex-1 overflow-y-auto p-6">
        <Link
          href="/debts"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Debts
        </Link>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="rounded-none shadow-none py-0">
            <CardContent className="p-4">
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

          <Card className="rounded-none shadow-none py-0">
            <CardContent className="p-4">
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

          <Card className="rounded-none shadow-none py-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                  Total Paid
                </span>
                <CheckCircle className="w-4 h-4 text-success" />
              </div>
              <p className="text-2xl font-semibold text-foreground mt-2">
                {paidRuns.length}
              </p>
              <p className="text-xs text-muted-foreground">
                Completed debt runs
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-none shadow-none py-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                  Total Debt Paid
                </span>
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-semibold text-foreground mt-2">
                {formatCurrency(
                  paidRuns.reduce((sum, r) => sum + Number(r.totalGross), 0)
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                All time
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Debt Runs Table */}
        <Card className="rounded-none shadow-none overflow-hidden">
          <CardHeader className="border-b px-6 py-4">
            <CardTitle className="text-sm">
              Debt Payment History
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Run Date
                </TableHead>
                <TableHead className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Employees
                </TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Gross Debt
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
              {debtRuns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="px-4 py-12 text-center">
                    <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No debt payment runs yet</p>
                    <Link
                      href="/debts/process"
                      className="mt-4 inline-block text-primary hover:underline"
                    >
                      Create your first debt run
                    </Link>
                  </TableCell>
                </TableRow>
              ) : (
                debtRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="px-4 py-4">
                      <Link
                        href={`/debts/runs/${run.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {new Date(run.runDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Link>
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
        </Card>
      </main>
    </>
  )
}
