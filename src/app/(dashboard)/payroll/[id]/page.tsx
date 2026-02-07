'use client'

import { useState, useEffect, use } from 'react'
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
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'

interface Payment {
  id: string
  lokwasi: {
    id: string
    name: string
    employeeCode: string
    bankName: string
    isAxisBank: boolean
  }
  grossAmount: number
  tdsRate: number
  tdsAmount: number
  leaveCashoutDays: number
  leaveCashoutAmount: number
  debtPayoutAmount: number
  netAmount: number
  customerReference: string
  paymentStatus: string
}

interface PayrollRun {
  id: string
  runDate: string
  payPeriodStart: string
  payPeriodEnd: string
  status: string
  totalGross: number
  totalTds: number
  totalNet: number
  totalDebtPayout: number
  totalLeaveCashout: number
  employeeCount: number
  notes: string | null
  createdAt: string
  processedAt: string | null
  paidAt: string | null
  payments: Payment[]
}

export default function PayrollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [payroll, setPayroll] = useState<PayrollRun | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isRerunning, setIsRerunning] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPayroll()
  }, [id])

  const fetchPayroll = async () => {
    try {
      const response = await fetch(`/api/payroll/${id}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/payroll')
          return
        }
        throw new Error('Failed to fetch payroll')
      }
      const data = await response.json()
      setPayroll(data.payrollRun)
    } catch (err) {
      console.error('Error fetching payroll:', err)
      setError('Failed to load payroll details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async (type: 'axis' | 'neft') => {
    setIsDownloading(type)
    try {
      const response = await fetch(`/api/payroll/${id}/download?type=${type}`)
      if (!response.ok) throw new Error('Failed to download')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const dateStr = payroll
        ? new Date(payroll.runDate).toISOString().split('T')[0]
        : 'payroll'
      a.download = `devalok-${type}-${dateStr}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()

      // Mark as processed if pending
      if (payroll?.status === 'PENDING') {
        await updateStatus('PROCESSED')
      }
    } catch (err) {
      console.error('Download error:', err)
      setError('Failed to download Excel file')
    } finally {
      setIsDownloading(null)
    }
  }

  const updateStatus = async (status: string) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/payroll/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error('Failed to update status')
      const data = await response.json()
      setPayroll(data.payrollRun)
    } catch (err) {
      console.error('Update error:', err)
      setError('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRerun = async () => {
    if (!confirm('This will create a new payroll run with fresh employee bank details and cancel this one. Continue?')) {
      return
    }
    setIsRerunning(true)
    setError('')
    try {
      const response = await fetch(`/api/payroll/${id}/rerun`, {
        method: 'POST',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to re-run payroll')
      }
      const data = await response.json()
      // Redirect to the new payroll run
      router.push(`/payroll/${data.payrollRun.id}`)
    } catch (err) {
      console.error('Re-run error:', err)
      setError(err instanceof Error ? err.message : 'Failed to re-run payroll')
    } finally {
      setIsRerunning(false)
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

  if (!payroll) {
    return (
      <>
        <Header title="Not Found" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[var(--muted-foreground)] mb-4">Payroll run not found</p>
            <Link href="/payroll" className="text-[var(--primary)] hover:underline">
              Back to Payroll
            </Link>
          </div>
        </main>
      </>
    )
  }

  const axisPayments = payroll.payments.filter((p) => p.lokwasi.isAxisBank)
  const neftPayments = payroll.payments.filter((p) => !p.lokwasi.isAxisBank)

  return (
    <>
      <Header
        title={`Payroll - ${new Date(payroll.runDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`}
      />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Back link */}
        <Link
          href="/payroll"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Payroll
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
                payroll.status === 'PAID'
                  ? 'bg-[var(--success-light)] text-[var(--success)]'
                  : payroll.status === 'PROCESSED'
                  ? 'bg-[var(--info-light)] text-[var(--info)]'
                  : payroll.status === 'PENDING'
                  ? 'bg-[var(--warning-light)] text-[var(--warning)]'
                  : payroll.status === 'CANCELLED'
                  ? 'bg-[var(--error-light)] text-[var(--error)]'
                  : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
              }`}
            >
              {payroll.status === 'PAID' && <CheckCircle className="w-4 h-4" />}
              {payroll.status === 'PROCESSED' && <Download className="w-4 h-4" />}
              {payroll.status === 'PENDING' && <Clock className="w-4 h-4" />}
              {payroll.status === 'CANCELLED' && <XCircle className="w-4 h-4" />}
              {payroll.status}
            </span>
            <span className="text-sm text-[var(--muted-foreground)]">
              Pay Period:{' '}
              {new Date(payroll.payPeriodStart).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              })}{' '}
              -{' '}
              {new Date(payroll.payPeriodEnd).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {payroll.status === 'PROCESSED' && (
              <button
                onClick={() => updateStatus('PAID')}
                disabled={isUpdating || isRerunning}
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
            {payroll.status !== 'PAID' && (
              <button
                onClick={handleRerun}
                disabled={isUpdating || isRerunning}
                className="flex items-center gap-2 px-4 py-2 border border-[var(--primary)] text-[var(--primary)] font-medium text-sm hover:bg-[var(--devalok-50)] disabled:opacity-50 transition-colors"
              >
                {isRerunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Re-run with Fresh Data
              </button>
            )}
            {payroll.status === 'PENDING' && (
              <button
                onClick={() => updateStatus('CANCELLED')}
                disabled={isUpdating || isRerunning}
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white p-4 border border-[var(--border)]">
            <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
              Employees
            </p>
            <p className="text-2xl font-semibold text-[var(--foreground)]">
              {payroll.employeeCount}
            </p>
          </div>
          <div className="bg-white p-4 border border-[var(--border)]">
            <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
              Total Gross
            </p>
            <p className="text-2xl font-semibold text-[var(--foreground)]">
              {formatCurrency(payroll.totalGross)}
            </p>
          </div>
          <div className="bg-white p-4 border border-[var(--border)]">
            <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
              Leave Cashout
            </p>
            <p className="text-2xl font-semibold text-[var(--success)]">
              {formatCurrency(payroll.totalLeaveCashout)}
            </p>
          </div>
          <div className="bg-white p-4 border border-[var(--border)]">
            <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
              Debt Payout
            </p>
            <p className="text-2xl font-semibold text-[var(--warning)]">
              {formatCurrency(payroll.totalDebtPayout)}
            </p>
          </div>
          <div className="bg-white p-4 border border-[var(--border)]">
            <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
              Total TDS
            </p>
            <p className="text-2xl font-semibold text-[var(--muted-foreground)]">
              {formatCurrency(payroll.totalTds)}
            </p>
          </div>
          <div className="bg-white p-4 border border-[var(--border)] border-[var(--primary)]">
            <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
              Net Payout
            </p>
            <p className="text-2xl font-semibold text-[var(--primary)]">
              {formatCurrency(payroll.totalNet)}
            </p>
          </div>
        </div>

        {/* Download Buttons */}
        {(payroll.status === 'PENDING' || payroll.status === 'PROCESSED') && (
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
                  No Axis Bank account holders in this payroll
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
                    Gross
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Leave
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Debt
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    TDS
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Net
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Bank
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {payroll.payments.map((payment) => (
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
                      {payment.customerReference}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-[var(--foreground)]">
                      {formatCurrency(payment.grossAmount)}
                    </td>
                    <td className="px-4 py-4 text-right text-sm">
                      {payment.leaveCashoutAmount > 0 ? (
                        <span className="text-[var(--success)]">
                          +{formatCurrency(payment.leaveCashoutAmount)}
                          <span className="text-xs block text-[var(--muted-foreground)]">
                            ({payment.leaveCashoutDays} days)
                          </span>
                        </span>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right text-sm">
                      {payment.debtPayoutAmount > 0 ? (
                        <span className="text-[var(--warning)]">
                          +{formatCurrency(payment.debtPayoutAmount)}
                        </span>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-[var(--muted-foreground)]">
                      {formatCurrency(payment.tdsAmount)}
                      <span className="text-xs block">({payment.tdsRate}%)</span>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-[var(--foreground)]">
                      {formatCurrency(payment.netAmount)}
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
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`text-xs px-2 py-0.5 ${
                          payment.paymentStatus === 'PAID'
                            ? 'bg-[var(--success-light)] text-[var(--success)]'
                            : payment.paymentStatus === 'FAILED'
                            ? 'bg-[var(--error-light)] text-[var(--error)]'
                            : 'bg-[var(--warning-light)] text-[var(--warning)]'
                        }`}
                      >
                        {payment.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-[var(--muted-foreground)]">
          <span>Created: {new Date(payroll.createdAt).toLocaleString('en-IN')}</span>
          {payroll.processedAt && (
            <span>Processed: {new Date(payroll.processedAt).toLocaleString('en-IN')}</span>
          )}
          {payroll.paidAt && (
            <span>Paid: {new Date(payroll.paidAt).toLocaleString('en-IN')}</span>
          )}
        </div>
      </main>
    </>
  )
}
