import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
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
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              View all debt runs
              <ArrowRight className="w-3 h-3 inline ml-1" />
            </Link>
          </div>
          <Link
            href="/debts/process"
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white font-medium text-sm hover:bg-[var(--devalok-700)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Process Debt Payments
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)]">
                Total Outstanding
              </span>
              <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />
            </div>
            <p className="text-2xl font-semibold text-[var(--warning)] mt-2">
              {formatCurrency(totalOutstanding)}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              From proprietorship transition
            </p>
          </div>

          <div className="bg-white p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)]">
                Total Repaid
              </span>
              <TrendingDown className="w-4 h-4 text-[var(--success)]" />
            </div>
            <p className="text-2xl font-semibold text-[var(--success)] mt-2">
              {formatCurrency(data.totalPaid)}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Via payroll payouts
            </p>
          </div>

          <div className="bg-white p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)]">
                Lokwasis with Debt
              </span>
              <Users className="w-4 h-4 text-[var(--primary)]" />
            </div>
            <p className="text-2xl font-semibold text-[var(--foreground)] mt-2">
              {lokwasisWithDebt.length}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              With outstanding balance
            </p>
          </div>

          <div className="bg-white p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)]">
                Fully Repaid
              </span>
              <CheckCircle className="w-4 h-4 text-[var(--success)]" />
            </div>
            <p className="text-2xl font-semibold text-[var(--foreground)] mt-2">
              {lokwasisFullyPaid.length}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Debt cleared
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-6 p-4 bg-[var(--muted)] border border-[var(--border)]">
          <div className="flex items-start gap-3">
            <Wallet className="w-5 h-5 text-[var(--muted-foreground)] mt-0.5" />
            <div>
              <h3 className="font-medium text-[var(--foreground)]">
                About Salary Debts
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                These are pending salary amounts from when Devalok transitioned from a
                sole proprietorship to a private limited company. Debt payouts can be
                processed via standalone debt runs or included in regular payroll runs.
                TDS is deducted from debt payouts and included in monthly TDS reports.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Debt by Employee */}
          <div className="lg:col-span-2 bg-white border border-[var(--border)]">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Outstanding Balances
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                      Outstanding
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                      Total Repaid
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {data.lokwasis.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center">
                        <Wallet className="w-12 h-12 mx-auto mb-4 text-[var(--muted-foreground)]" />
                        <p className="text-[var(--muted-foreground)]">No salary debts recorded</p>
                      </td>
                    </tr>
                  ) : (
                    data.lokwasis.map((lokwasi) => {
                      const outstanding = Number(lokwasi.salaryDebtBalance)
                      const totalRepaid = lokwasi.debtPayments.reduce(
                        (sum, p) => sum + Number(p.amount),
                        0
                      )
                      const isFullyPaid = outstanding === 0 && lokwasi.debtPayments.length > 0

                      return (
                        <tr
                          key={lokwasi.id}
                          className="hover:bg-[var(--muted)] transition-colors"
                        >
                          <td className="px-4 py-4">
                            <Link
                              href={`/lokwasis/${lokwasi.id}`}
                              className="font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
                            >
                              {lokwasi.name}
                            </Link>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {lokwasi.employeeCode}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-right">
                            {outstanding > 0 ? (
                              <span className="font-semibold text-[var(--warning)]">
                                {formatCurrency(outstanding)}
                              </span>
                            ) : (
                              <span className="text-[var(--muted-foreground)]">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {totalRepaid > 0 ? (
                              <span className="text-[var(--success)]">
                                {formatCurrency(totalRepaid)}
                              </span>
                            ) : (
                              <span className="text-[var(--muted-foreground)]">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {isFullyPaid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-[var(--success-light)] text-[var(--success)]">
                                <CheckCircle className="w-3 h-3" />
                                CLEARED
                              </span>
                            ) : outstanding > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-[var(--warning-light)] text-[var(--warning)]">
                                PENDING
                              </span>
                            ) : (
                              <span className="text-xs text-[var(--muted-foreground)]">
                                No debt
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Payments */}
          <div className="bg-white border border-[var(--border)]">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Recent Debt Payments
              </h2>
            </div>
            {data.recentPayments.length === 0 ? (
              <div className="p-6 text-center">
                <TrendingDown className="w-8 h-8 mx-auto mb-3 text-[var(--muted-foreground)]" />
                <p className="text-sm text-[var(--muted-foreground)]">
                  No debt payments yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {data.recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="px-4 py-3 hover:bg-[var(--muted)] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {payment.lokwasi.name}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {new Date(payment.paymentDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <span className="font-medium text-[var(--success)]">
                        {formatCurrency(Number(payment.amount))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
