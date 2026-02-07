import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import {
  Plus,
  Calendar,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
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

function getStatusIcon(status: string) {
  switch (status) {
    case 'PAID':
      return <CheckCircle className="w-4 h-4 text-[var(--success)]" />
    case 'PROCESSED':
      return <Download className="w-4 h-4 text-[var(--info)]" />
    case 'PENDING':
      return <Clock className="w-4 h-4 text-[var(--warning)]" />
    case 'DRAFT':
      return <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />
    case 'CANCELLED':
      return <XCircle className="w-4 h-4 text-[var(--error)]" />
    default:
      return <Clock className="w-4 h-4" />
  }
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    PAID: 'bg-[var(--success-light)] text-[var(--success)]',
    PROCESSED: 'bg-[var(--info-light)] text-[var(--info)]',
    PENDING: 'bg-[var(--warning-light)] text-[var(--warning)]',
    DRAFT: 'bg-[var(--muted)] text-[var(--muted-foreground)]',
    CANCELLED: 'bg-[var(--error-light)] text-[var(--error)]',
  }
  return styles[status] || 'bg-[var(--muted)] text-[var(--muted-foreground)]'
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
              <p className="text-sm text-[var(--muted-foreground)]">
                Next scheduled: {new Date(schedule.nextPayrollDate).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
          <Link
            href="/payroll/new"
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white font-medium text-sm hover:bg-[var(--devalok-700)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Payroll Run
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)]">
                Pending
              </span>
              <Clock className="w-4 h-4 text-[var(--warning)]" />
            </div>
            <p className="text-2xl font-semibold text-[var(--foreground)] mt-2">
              {pendingRuns.length}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {pendingRuns.length > 0 ? 'Needs attention' : 'All clear'}
            </p>
          </div>

          <div className="bg-white p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)]">
                Processed
              </span>
              <Download className="w-4 h-4 text-[var(--info)]" />
            </div>
            <p className="text-2xl font-semibold text-[var(--foreground)] mt-2">
              {processedRuns.length}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Awaiting bank confirmation
            </p>
          </div>

          <div className="bg-white p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)]">
                Paid This Month
              </span>
              <CheckCircle className="w-4 h-4 text-[var(--success)]" />
            </div>
            <p className="text-2xl font-semibold text-[var(--foreground)] mt-2">
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
            <p className="text-xs text-[var(--muted-foreground)]">
              Completed runs
            </p>
          </div>

          <div className="bg-white p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)]">
                Total Paid MTD
              </span>
              <Calendar className="w-4 h-4 text-[var(--primary)]" />
            </div>
            <p className="text-2xl font-semibold text-[var(--foreground)] mt-2">
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
            <p className="text-xs text-[var(--muted-foreground)]">
              Month to date
            </p>
          </div>
        </div>

        {/* Pending Payrolls Alert */}
        {pendingRuns.length > 0 && (
          <div className="mb-6 p-4 bg-[var(--warning-light)] border border-[var(--warning)]">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[var(--warning)]" />
              <div className="flex-1">
                <p className="font-medium text-[var(--warning)]">
                  {pendingRuns.length} payroll run{pendingRuns.length > 1 ? 's' : ''} pending
                </p>
                <p className="text-sm text-[var(--neutral-700)] mt-1">
                  Click on a pending run to review and download Excel for bank processing
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payroll Runs Table */}
        <div className="bg-white border border-[var(--border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Payroll History
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Run Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Pay Period
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Employees
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Total Gross
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    TDS
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Net Payout
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Paid At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {payrollRuns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-[var(--muted-foreground)]" />
                      <p className="text-[var(--muted-foreground)]">No payroll runs yet</p>
                      <Link
                        href="/payroll/new"
                        className="mt-4 inline-block text-[var(--primary)] hover:underline"
                      >
                        Create your first payroll run
                      </Link>
                    </td>
                  </tr>
                ) : (
                  payrollRuns.map((run) => (
                    <tr
                      key={run.id}
                      className="hover:bg-[var(--muted)] transition-colors"
                    >
                      <td className="px-4 py-4">
                        <Link
                          href={`/payroll/${run.id}`}
                          className="font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
                        >
                          {new Date(run.runDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--muted-foreground)]">
                        {new Date(run.payPeriodStart).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        -{' '}
                        {new Date(run.payPeriodEnd).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-[var(--foreground)]">
                        {run.employeeCount}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-[var(--foreground)]">
                        {formatCurrency(Number(run.totalGross))}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-[var(--muted-foreground)]">
                        {formatCurrency(Number(run.totalTds))}
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-[var(--foreground)]">
                        {formatCurrency(Number(run.totalNet))}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium ${getStatusBadge(
                            run.status
                          )}`}
                        >
                          {getStatusIcon(run.status)}
                          {run.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--muted-foreground)]">
                        {run.paidAt
                          ? new Date(run.paidAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  )
}
