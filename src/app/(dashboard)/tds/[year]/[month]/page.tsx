'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { formatCurrency } from '@/lib/utils'
import {
  ArrowLeft,
  Download,
  Loader2,
  CheckCircle,
  Clock,
  FileText,
} from 'lucide-react'

interface TdsRecord {
  id: string
  lokwasi: {
    id: string
    name: string
    employeeCode: string
    pan: string
    aadhaar: string
    natureOfWork: string
  }
  totalGross: number
  totalTds: number
  totalNet: number
  paymentCount: number
  filingStatus: string
  challanNumber: string | null
  filedDate: string | null
  paidDate: string | null
}

interface MonthlyTdsData {
  year: number
  month: number
  records: TdsRecord[]
  totals: {
    totalGross: number
    totalTds: number
    totalNet: number
    employeeCount: number
  }
}

export default function TdsMonthDetailPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>
}) {
  const { year, month } = use(params)
  const router = useRouter()
  const [data, setData] = useState<MonthlyTdsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState('')

  const yearNum = parseInt(year)
  const monthNum = parseInt(month)

  useEffect(() => {
    fetchTdsData()
  }, [year, month])

  const fetchTdsData = async () => {
    try {
      const response = await fetch(`/api/tds/${year}/${month}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/tds')
          return
        }
        throw new Error('Failed to fetch TDS data')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching TDS data:', err)
      setError('Failed to load TDS data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const response = await fetch(`/api/tds/${year}/${month}/download`)
      if (!response.ok) throw new Error('Failed to download')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `devalok-tds-${year}-${month.toString().padStart(2, '0')}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (err) {
      console.error('Download error:', err)
      setError('Failed to download TDS report')
    } finally {
      setIsDownloading(false)
    }
  }

  const updateAllStatus = async (status: string) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/tds/${year}/${month}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error('Failed to update status')
      await fetchTdsData()
    } catch (err) {
      console.error('Update error:', err)
      setError('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const monthName = new Date(yearNum, monthNum - 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })

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

  if (!data) {
    return (
      <>
        <Header title="Not Found" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[var(--muted-foreground)] mb-4">No TDS data for this month</p>
            <Link href="/tds" className="text-[var(--primary)] hover:underline">
              Back to TDS
            </Link>
          </div>
        </main>
      </>
    )
  }

  const hasPending = data.records.some((r) => r.filingStatus === 'PENDING')
  const hasWaiting = data.records.some((r) => r.filingStatus === 'WAITING_FOR_FILING')
  const hasFiled = data.records.some((r) => r.filingStatus === 'FILED')
  const allPaid = data.records.every((r) => r.filingStatus === 'PAID')

  return (
    <>
      <Header title={`TDS - ${monthName}`} />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Back link */}
        <Link
          href="/tds"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to TDS
        </Link>

        {error && (
          <div className="mb-6 p-4 bg-[var(--error-light)] border border-[var(--error)] text-[var(--error)]">
            {error}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 border border-[var(--border)]">
            <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
              Employees
            </p>
            <p className="text-2xl font-semibold text-[var(--foreground)]">
              {data.totals.employeeCount}
            </p>
          </div>
          <div className="bg-white p-4 border border-[var(--border)]">
            <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
              Total Gross
            </p>
            <p className="text-2xl font-semibold text-[var(--foreground)]">
              {formatCurrency(data.totals.totalGross)}
            </p>
          </div>
          <div className="bg-white p-4 border border-[var(--border)]">
            <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
              TDS Deducted
            </p>
            <p className="text-2xl font-semibold text-[var(--primary)]">
              {formatCurrency(data.totals.totalTds)}
            </p>
          </div>
          <div className="bg-white p-4 border border-[var(--border)]">
            <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
              Net Paid
            </p>
            <p className="text-2xl font-semibold text-[var(--foreground)]">
              {formatCurrency(data.totals.totalNet)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-[var(--devalok-50)] border border-[var(--devalok-200)] p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-[var(--foreground)]">TDS Report for CA</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Download the report and share with your CA for filing
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white font-medium text-sm hover:bg-[var(--devalok-700)] disabled:opacity-50 transition-colors"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download Excel
              </button>

              {hasPending && (
                <button
                  onClick={() => updateAllStatus('WAITING_FOR_FILING')}
                  disabled={isUpdating}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--info)] text-white font-medium text-sm hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  Mark Sent to CA
                </button>
              )}

              {hasWaiting && (
                <button
                  onClick={() => updateAllStatus('FILED')}
                  disabled={isUpdating}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--devalok-700)] text-white font-medium text-sm hover:bg-[var(--devalok-800)] disabled:opacity-50 transition-colors"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Mark Filed
                </button>
              )}

              {hasFiled && !allPaid && (
                <button
                  onClick={() => updateAllStatus('PAID')}
                  disabled={isUpdating}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--success)] text-white font-medium text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Mark Paid
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Details Table */}
        <div className="bg-white border border-[var(--border)]">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Employee-wise TDS Details
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
                    PAN
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Nature of Work
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Payments
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Gross
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    TDS
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Net
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {data.records.map((record) => (
                  <tr
                    key={record.id}
                    className="hover:bg-[var(--muted)] transition-colors"
                  >
                    <td className="px-4 py-4">
                      <Link
                        href={`/lokwasis/${record.lokwasi.id}`}
                        className="font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
                      >
                        {record.lokwasi.name}
                      </Link>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {record.lokwasi.employeeCode}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm font-mono text-[var(--foreground)]">
                      {record.lokwasi.pan}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--muted-foreground)]">
                      {record.lokwasi.natureOfWork}
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-[var(--foreground)]">
                      {record.paymentCount}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-[var(--foreground)]">
                      {formatCurrency(record.totalGross)}
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-[var(--primary)]">
                      {formatCurrency(record.totalTds)}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-[var(--foreground)]">
                      {formatCurrency(record.totalNet)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium ${
                          record.filingStatus === 'PAID'
                            ? 'bg-[var(--success-light)] text-[var(--success)]'
                            : record.filingStatus === 'FILED'
                            ? 'bg-[var(--devalok-100)] text-[var(--primary)]'
                            : record.filingStatus === 'WAITING_FOR_FILING'
                            ? 'bg-[var(--info)] bg-opacity-20 text-[var(--info)]'
                            : 'bg-[var(--warning-light)] text-[var(--warning)]'
                        }`}
                      >
                        {record.filingStatus === 'PAID' && <CheckCircle className="w-3 h-3" />}
                        {record.filingStatus === 'FILED' && <CheckCircle className="w-3 h-3" />}
                        {record.filingStatus === 'WAITING_FOR_FILING' && <FileText className="w-3 h-3" />}
                        {record.filingStatus === 'PENDING' && <Clock className="w-3 h-3" />}
                        {record.filingStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[var(--muted)] font-semibold">
                  <td colSpan={4} className="px-4 py-3 text-right text-sm text-[var(--foreground)]">
                    TOTAL
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-[var(--foreground)]">
                    {formatCurrency(data.totals.totalGross)}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--primary)]">
                    {formatCurrency(data.totals.totalTds)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-[var(--foreground)]">
                    {formatCurrency(data.totals.totalNet)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </main>
    </>
  )
}
