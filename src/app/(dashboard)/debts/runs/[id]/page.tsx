'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { formatCurrency } from '@/lib/utils'
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Download,
  FileSpreadsheet,
  Loader2,
  XCircle,
  Wallet,
} from 'lucide-react'

interface DebtPayment {
  id: string
  lokwasi: {
    id: string
    name: string
    employeeCode: string
    bankName: string
    isAxisBank: boolean
  }
  amount: number
  tdsRate: number | null
  tdsAmount: number | null
  netAmount: number | null
  balanceAfter: number
  customerReference: string | null
}

interface DebtRun {
  id: string
  runDate: string
  status: string
  totalGross: number
  totalTds: number
  totalNet: number
  employeeCount: number
  notes: string | null
  createdAt: string
  processedAt: string | null
  paidAt: string | null
  debtPayments: DebtPayment[]
}

export default function DebtRunDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const router = useRouter()
  const [debtRun, setDebtRun] = useState<DebtRun | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDebtRun()
  }, [id])

  const fetchDebtRun = async () => {
    try {
      const response = await fetch(`/api/debt-runs/${id}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/debts/runs')
          return
        }
        throw new Error('Failed to fetch debt run')
      }
      const data = await response.json()
      setDebtRun(data.debtRun)
    } catch (err) {
      console.error('Error fetching debt run:', err)
      setError('Failed to load debt run details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async (type: 'axis' | 'neft') => {
    setIsDownloading(type)
    try {
      const response = await fetch(`/api/debt-runs/${id}/download?type=${type}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to download')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const dateStr = debtRun
        ? new Date(debtRun.runDate).toISOString().split('T')[0]
        : 'debt'
      a.download = `devalok-debt-${type}-${dateStr}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()

      // Mark as processed if pending
      if (debtRun?.status === 'PENDING') {
        await updateStatus('PROCESSED')
      }
    } catch (err) {
      console.error('Download error:', err)
      const message = err instanceof Error ? err.message : 'Failed to download Excel file'
      setError(message)
    } finally {
      setIsDownloading(null)
    }
  }

  const updateStatus = async (status: string) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/debt-runs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error('Failed to update status')
      const data = await response.json()
      setDebtRun(data.debtRun)
    } catch (err) {
      console.error('Update error:', err)
      setError('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <Header title="Loading..." />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        </main>
      </>
    )
  }

  if (!debtRun) {
    return (
      <>
        <Header title="Not Found" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[var(--muted-foreground)] mb-4">Debt run not found</p>
            <Link href="/debts/runs" className="text-[var(--primary)] hover:underline">
              Back to Debt Runs
            </Link>
          </div>
        </main>
      </>
    )
  }

  const axisPayments = debtRun.debtPayments.filter((p) => p.lokwasi.isAxisBank)
  const neftPayments = debtRun.debtPayments.filter((p) => !p.lokwasi.isAxisBank)

  return (
    <>
      <Header
        title={`Debt Run - ${new Date(debtRun.runDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`}
      />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Back link */}
        <Link
          href="/debts/runs"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Debt Runs
        </Link>

        {error && (
          <div className="mb-6 p-4 bg-[var(--error-light)] border border-[var(--error)] text-[var(--error)]">
            {error}
          </div>
        )}

        {/* Status & Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium ${
                debtRun.status === 'PAID'
                  ? 'bg-[var(--success-light)] text-[var(--success)]'
                  : debtRun.status === 'PROCESSED'
                  ? 'bg-[var(--info-light)] text-[var(--info)]'
                  : debtRun.status === 'PENDING'
                  ? 'bg-[var(--warning-light)] text-[var(--warning)]'
                  : debtRun.status === 'CANCELLED'
                  ? 'bg-[var(--error-light)] text-[var(--error)]'
                  : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
              }`}
            >
              {debtRun.status === 'PAID' && <CheckCircle className="w-4 h-4" />}
              {debtRun.status === 'PROCESSED' && <Download className="w-4 h-4" />}
              {debtRun.status === 'PENDING' && <Clock className="w-4 h-4" />}
              {debtRun.status === 'CANCELLED' && <XCircle className="w-4 h-4" />}
              {debtRun.status}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {debtRun.status === 'PROCESSED' && (
              <button
                onClick={() => updateStatus('PAID')}
                disabled={isUpdating}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--success)] text-white font-medium text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Mark as Paid
              </button>
            )}
            {debtRun.status === 'PENDING' && (
              <button
                onClick={() => updateStatus('CANCELLED')}
                disabled={isUpdating}
                className="flex items-center gap-2 px-4 py-2 border border-[var(--error)] text-[var(--error)] font-medium text-sm hover:bg-[var(--error-light)] disabled:opacity-50 transition-colors"
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 border border-[var(--border)]">
            <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
              Employees
            </p>
            <p className="text-2xl font-semibold text-[var(--foreground)]">
              {debtRun.employeeCount}
            </p>
          </div>
          <div className="bg-white p-4 border border-[var(--border)]">
            <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
              Gross Debt
            </p>
            <p className="text-2xl font-semibold text-[var(--warning)]">
              {formatCurrency(debtRun.totalGross)}
            </p>
          </div>
          <div className="bg-white p-4 border border-[var(--border)]">
            <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
              Total TDS
            </p>
            <p className="text-2xl font-semibold text-[var(--muted-foreground)]">
              {formatCurrency(debtRun.totalTds)}
            </p>
          </div>
          <div className="bg-white p-4 border border-[var(--border)] border-[var(--primary)]">
            <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
              Net Payout
            </p>
            <p className="text-2xl font-semibold text-[var(--primary)]">
              {formatCurrency(debtRun.totalNet)}
            </p>
          </div>
        </div>

        {/* Download Buttons */}
        {(debtRun.status === 'PENDING' || debtRun.status === 'PROCESSED') && (
          <div className="mb-6">
            <div className="bg-[var(--devalok-50)] border border-[var(--devalok-200)] p-4">
              <div className="flex items-start gap-3 mb-4">
                <FileSpreadsheet className="w-5 h-5 text-[var(--primary)] mt-0.5" />
                <div>
                  <h3 className="font-medium text-[var(--foreground)]">
                    Download Payment Excel
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Download the payment files and upload them to Axis Net Banking
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                {axisPayments.length > 0 && (
                  <button
                    onClick={() => handleDownload('axis')}
                    disabled={isDownloading !== null}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white font-medium text-sm hover:bg-[var(--devalok-700)] disabled:opacity-50 transition-colors"
                  >
                    {isDownloading === 'axis' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Axis Bank ({axisPayments.length})
                  </button>
                )}
                {neftPayments.length > 0 && (
                  <button
                    onClick={() => handleDownload('neft')}
                    disabled={isDownloading !== null}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--devalok-800)] text-white font-medium text-sm hover:bg-[var(--devalok-900)] disabled:opacity-50 transition-colors"
                  >
                    {isDownloading === 'neft' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    NEFT ({neftPayments.length})
                  </button>
                )}
              </div>
              {axisPayments.length === 0 && (
                <p className="text-sm text-[var(--muted-foreground)] mt-2">
                  No Axis Bank account holders in this debt run
                </p>
              )}
              {neftPayments.length === 0 && (
                <p className="text-sm text-[var(--muted-foreground)] mt-2">
                  No NEFT payments required - all employees have Axis accounts
                </p>
              )}
            </div>
          </div>
        )}

        {/* Payments Table */}
        <div className="bg-white border border-[var(--border)]">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Payment Details
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Reference
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Gross Debt
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    TDS
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Net
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Balance After
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Bank
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {debtRun.debtPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Wallet className="w-12 h-12 mx-auto mb-4 text-[var(--muted-foreground)]" />
                      <p className="text-[var(--muted-foreground)]">No payments in this run</p>
                    </td>
                  </tr>
                ) : (
                  debtRun.debtPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-[var(--muted)] transition-colors">
                      <td className="px-4 py-4">
                        <Link
                          href={`/lokwasis/${payment.lokwasi.id}`}
                          className="font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
                        >
                          {payment.lokwasi.name}
                        </Link>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {payment.lokwasi.employeeCode}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm font-mono text-[var(--muted-foreground)]">
                        {payment.customerReference || '-'}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-[var(--warning)]">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-[var(--muted-foreground)]">
                        {payment.tdsAmount !== null ? (
                          <>
                            {formatCurrency(payment.tdsAmount)}
                            <span className="text-xs block">({payment.tdsRate}%)</span>
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-[var(--foreground)]">
                        {payment.netAmount !== null
                          ? formatCurrency(payment.netAmount)
                          : '-'}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-[var(--muted-foreground)]">
                        {formatCurrency(payment.balanceAfter)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {payment.lokwasi.isAxisBank ? (
                          <span className="text-xs px-1.5 py-0.5 bg-[var(--info)] text-white">
                            AXIS
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {payment.lokwasi.bankName}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-[var(--muted-foreground)]">
          <span>Created: {new Date(debtRun.createdAt).toLocaleString('en-IN')}</span>
          {debtRun.processedAt && (
            <span>Processed: {new Date(debtRun.processedAt).toLocaleString('en-IN')}</span>
          )}
          {debtRun.paidAt && (
            <span>Paid: {new Date(debtRun.paidAt).toLocaleString('en-IN')}</span>
          )}
        </div>
      </main>
    </>
  )
}
