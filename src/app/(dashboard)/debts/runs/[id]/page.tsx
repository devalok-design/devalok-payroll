'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Header } from '@/components/layout/Header'
import { Badge } from '@/components/ui/badge'
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
import { formatCurrency } from '@/lib/utils'
import {
  ArrowLeft,
  CheckCircle,
  Download,
  FileSpreadsheet,
  Loader2,
  Wallet,
  XCircle,
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
      toast.error('Failed to load debt run details')
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
      toast.error(message)
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
      toast.success(`Status updated to ${status}`)
    } catch (err) {
      console.error('Update error:', err)
      toast.error('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <Header title="Loading..." />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
            <p className="text-muted-foreground mb-4">Debt run not found</p>
            <Link href="/debts/runs" className="text-primary hover:underline">
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
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Debt Runs
        </Link>

        {/* Status & Actions */}
        <div className="flex items-center justify-between mb-6">
          <StatusBadge status={debtRun.status} />

          <div className="flex items-center gap-3">
            {debtRun.status === 'PROCESSED' && (
              <Button
                onClick={() => updateStatus('PAID')}
                disabled={isUpdating}
                className="bg-success text-white hover:bg-success/80"
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Mark as Paid
              </Button>
            )}
            {debtRun.status === 'PENDING' && (
              <Button
                variant="outline"
                onClick={() => updateStatus('CANCELLED')}
                disabled={isUpdating}
                className="border-error text-error hover:bg-error-light"
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="rounded-none shadow-none py-0 gap-0">
            <CardContent className="p-4">
              <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                Employees
              </p>
              <p className="text-2xl font-semibold text-foreground">
                {debtRun.employeeCount}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-none shadow-none py-0 gap-0">
            <CardContent className="p-4">
              <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                Gross Debt
              </p>
              <p className="text-2xl font-semibold text-warning">
                {formatCurrency(debtRun.totalGross)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-none shadow-none py-0 gap-0">
            <CardContent className="p-4">
              <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                Total TDS
              </p>
              <p className="text-2xl font-semibold text-muted-foreground">
                {formatCurrency(debtRun.totalTds)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-none shadow-none py-0 gap-0 border-primary">
            <CardContent className="p-4">
              <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                Net Payout
              </p>
              <p className="text-2xl font-semibold text-primary">
                {formatCurrency(debtRun.totalNet)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Download Buttons */}
        {(debtRun.status === 'PENDING' || debtRun.status === 'PROCESSED') && (
          <Card className="rounded-none shadow-none py-0 gap-0 mb-6 bg-devalok-50 border-devalok-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-4">
                <FileSpreadsheet className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-medium text-foreground">
                    Download Payment Excel
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Download the payment files and upload them to Axis Net Banking
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                {axisPayments.length > 0 && (
                  <Button
                    onClick={() => handleDownload('axis')}
                    disabled={isDownloading !== null}
                  >
                    {isDownloading === 'axis' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Axis Bank ({axisPayments.length})
                  </Button>
                )}
                {neftPayments.length > 0 && (
                  <Button
                    onClick={() => handleDownload('neft')}
                    disabled={isDownloading !== null}
                    className="bg-devalok-800 text-white hover:bg-devalok-900"
                  >
                    {isDownloading === 'neft' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    NEFT ({neftPayments.length})
                  </Button>
                )}
              </div>
              {axisPayments.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  No Axis Bank account holders in this debt run
                </p>
              )}
              {neftPayments.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  No NEFT payments required - all employees have Axis accounts
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payments Table */}
        <Card className="rounded-none shadow-none py-0 gap-0 overflow-hidden">
          <CardHeader className="border-b px-6 py-4">
            <CardTitle className="text-sm">Payment Details</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Employee
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Reference
                </TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Gross Debt
                </TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  TDS
                </TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Net
                </TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Balance After
                </TableHead>
                <TableHead className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Bank
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debtRun.debtPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="px-4 py-12 text-center">
                    <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No payments in this run</p>
                  </TableCell>
                </TableRow>
              ) : (
                debtRun.debtPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="px-4 py-4">
                      <Link
                        href={`/lokwasis/${payment.lokwasi.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {payment.lokwasi.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {payment.lokwasi.employeeCode}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm font-mono text-muted-foreground">
                      {payment.customerReference || '-'}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right text-sm text-warning">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right text-sm text-muted-foreground">
                      {payment.tdsAmount !== null ? (
                        <>
                          {formatCurrency(payment.tdsAmount)}
                          <span className="text-xs block">({payment.tdsRate}%)</span>
                        </>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right font-semibold text-foreground">
                      {payment.netAmount !== null
                        ? formatCurrency(payment.netAmount)
                        : '-'}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right text-sm text-muted-foreground">
                      {formatCurrency(payment.balanceAfter)}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-center">
                      {payment.lokwasi.isAxisBank ? (
                        <Badge variant="info">AXIS</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {payment.lokwasi.bankName}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Metadata */}
        <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
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
