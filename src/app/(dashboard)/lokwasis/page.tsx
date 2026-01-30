import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { prisma } from '@/lib/prisma'
import { formatCurrency, maskPan, formatDate } from '@/lib/utils'
import { Plus, Search, Users, UserX } from 'lucide-react'

async function getLokwasis() {
  return prisma.lokwasi.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      employeeCode: true,
      name: true,
      pan: true,
      aadhaar: true,
      bankName: true,
      grossSalary: true,
      tdsRate: true,
      leaveBalance: true,
      salaryDebtBalance: true,
      status: true,
      isAxisBank: true,
      terminatedDate: true,
    },
  })
}

export default async function LokwasisPage() {
  const lokwasis = await getLokwasis()
  const activeLokwasis = lokwasis.filter((l) => l.status === 'ACTIVE')
  const terminatedLokwasis = lokwasis.filter((l) => l.status === 'TERMINATED')
  const inactiveLokwasis = lokwasis.filter((l) => l.status === 'INACTIVE')

  return (
    <>
      <Header title="Lokwasis" />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Header with actions */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-[var(--muted-foreground)]">
              {activeLokwasis.length} active team members
              {terminatedLokwasis.length > 0 && (
                <span className="ml-2 text-[var(--error)]">
                  • {terminatedLokwasis.length} terminated
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Search lokwasis..."
                className="pl-10 pr-4 py-2 border border-[var(--border)] bg-white text-sm focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
            <Link
              href="/lokwasis/new"
              className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white font-medium text-sm hover:bg-[var(--devalok-700)] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Lokwasi
            </Link>
          </div>
        </div>

        {/* Active Lokwasis Table */}
        <div className="bg-white border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    PAN
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Bank
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Salary
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    TDS %
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Leave Balance
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Debt
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {activeLokwasis.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <Users className="w-12 h-12 mx-auto mb-4 text-[var(--muted-foreground)]" />
                      <p className="text-[var(--muted-foreground)]">No active lokwasis found</p>
                      <Link
                        href="/lokwasis/new"
                        className="mt-4 inline-block text-[var(--primary)] hover:underline"
                      >
                        Add your first lokwasi
                      </Link>
                    </td>
                  </tr>
                ) : (
                  activeLokwasis.map((lokwasi) => (
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
                      <td className="px-4 py-4 text-sm text-[var(--muted-foreground)]">
                        {maskPan(lokwasi.pan)}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-[var(--foreground)]">
                          {lokwasi.bankName || '-'}
                        </span>
                        {lokwasi.isAxisBank && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 bg-[var(--info)] text-white">
                            AXIS
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-[var(--foreground)]">
                        {formatCurrency(Number(lokwasi.grossSalary))}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-[var(--foreground)]">
                        {Number(lokwasi.tdsRate)}%
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-[var(--foreground)]">
                        {Number(lokwasi.leaveBalance)} days
                      </td>
                      <td className="px-4 py-4 text-right">
                        {Number(lokwasi.salaryDebtBalance) > 0 ? (
                          <span className="font-medium text-[var(--warning)]">
                            {formatCurrency(Number(lokwasi.salaryDebtBalance))}
                          </span>
                        ) : (
                          <span className="text-sm text-[var(--muted-foreground)]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-[var(--success-light)] text-[var(--success)]">
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        {activeLokwasis.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 border border-[var(--border)]">
              <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                Total Monthly Salary
              </p>
              <p className="text-xl font-semibold text-[var(--foreground)]">
                {formatCurrency(
                  activeLokwasis.reduce((sum, l) => sum + Number(l.grossSalary) * 2, 0)
                )}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                (2 pay cycles)
              </p>
            </div>
            <div className="bg-white p-4 border border-[var(--border)]">
              <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                Total Leave Balance
              </p>
              <p className="text-xl font-semibold text-[var(--foreground)]">
                {activeLokwasis.reduce((sum, l) => sum + Number(l.leaveBalance), 0)} days
              </p>
            </div>
            <div className="bg-white p-4 border border-[var(--border)]">
              <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                Total Pending Debt
              </p>
              <p className="text-xl font-semibold text-[var(--warning)]">
                {formatCurrency(
                  activeLokwasis.reduce((sum, l) => sum + Number(l.salaryDebtBalance), 0)
                )}
              </p>
            </div>
          </div>
        )}

        {/* Terminated Lokwasis Section */}
        {terminatedLokwasis.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <UserX className="w-5 h-5 text-[var(--error)]" />
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Terminated Lokwasis
              </h2>
              <span className="text-sm text-[var(--muted-foreground)]">
                ({terminatedLokwasis.length})
              </span>
            </div>
            <div className="bg-white border border-[var(--border)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                      <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                        PAN
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                        Last Salary
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                        Outstanding Debt
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                        Terminated Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {terminatedLokwasis.map((lokwasi) => (
                      <tr
                        key={lokwasi.id}
                        className="hover:bg-[var(--muted)] transition-colors opacity-75"
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
                        <td className="px-4 py-4 text-sm text-[var(--muted-foreground)]">
                          {maskPan(lokwasi.pan)}
                        </td>
                        <td className="px-4 py-4 text-right text-sm text-[var(--muted-foreground)]">
                          {formatCurrency(Number(lokwasi.grossSalary))}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {Number(lokwasi.salaryDebtBalance) > 0 ? (
                            <span className="font-medium text-[var(--warning)]">
                              {formatCurrency(Number(lokwasi.salaryDebtBalance))}
                            </span>
                          ) : (
                            <span className="text-sm text-[var(--muted-foreground)]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-[var(--error)]">
                          {lokwasi.terminatedDate
                            ? formatDate(lokwasi.terminatedDate)
                            : 'Unknown'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Terminated summary */}
            <div className="mt-4 p-4 bg-[var(--error-light)] border border-[var(--error)]/20">
              <p className="text-sm text-[var(--error)]">
                <strong>Outstanding debt from terminated lokwasis:</strong>{' '}
                {formatCurrency(
                  terminatedLokwasis.reduce((sum, l) => sum + Number(l.salaryDebtBalance), 0)
                )}
              </p>
            </div>
          </div>
        )}

        {/* Inactive Lokwasis Section (if any) */}
        {inactiveLokwasis.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
              Inactive Lokwasis ({inactiveLokwasis.length})
            </h2>
            <div className="bg-white border border-[var(--border)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                      <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                        Name
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                        Last Salary
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                        Outstanding Debt
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {inactiveLokwasis.map((lokwasi) => (
                      <tr
                        key={lokwasi.id}
                        className="hover:bg-[var(--muted)] transition-colors opacity-60"
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
                        <td className="px-4 py-4 text-right text-sm text-[var(--muted-foreground)]">
                          {formatCurrency(Number(lokwasi.grossSalary))}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {Number(lokwasi.salaryDebtBalance) > 0 ? (
                            <span className="font-medium text-[var(--warning)]">
                              {formatCurrency(Number(lokwasi.salaryDebtBalance))}
                            </span>
                          ) : (
                            <span className="text-sm text-[var(--muted-foreground)]">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
