'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CheckCircle,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Save,
  Info,
  XCircle,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { formatCurrency } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

interface Payment {
  id: string
  lokwasi: {
    id: string
    name: string
    employeeCode: string
    bankName: string
    isAxisBank: boolean
    leaveBalance: number
    salaryDebtBalance: number
    accountBalance: number
  }
  grossAmount: number
  tdsRate: number
  tdsAmount: number
  leaveCashoutDays: number
  leaveCashoutAmount: number
  debtPayoutAmount: number
  accountDebitAmount: number
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
  cycleDays: number
  notes: string | null
  createdAt: string
  processedAt: string | null
  paidAt: string | null
  payments: Payment[]
}

interface EditableValues {
  leaveCashoutDays: number
  debtPayoutAmount: number
}

export default function PayrollDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const router = useRouter()
  const [payroll, setPayroll] = useState<PayrollRun | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isRerunning, setIsRerunning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Editable payment values (keyed by payment id)
  const [edits, setEdits] = useState<Record<string, EditableValues>>({})

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
      // Initialize edits from server data
      const initialEdits: Record<string, EditableValues> = {}
      for (const p of data.payrollRun.payments) {
        initialEdits[p.id] = {
          leaveCashoutDays: p.leaveCashoutDays,
          debtPayoutAmount: p.debtPayoutAmount,
        }
      }
      setEdits(initialEdits)
    } catch (err) {
      console.error('Error fetching payroll:', err)
      toast.error('Failed to load payroll details')
    } finally {
      setIsLoading(false)
    }
  }

  // Check if any edits differ from server data
  const hasUnsavedChanges = useMemo(() => {
    if (!payroll) return false
    return payroll.payments.some((p) => {
      const edit = edits[p.id]
      if (!edit) return false
      return (
        edit.leaveCashoutDays !== p.leaveCashoutDays ||
        edit.debtPayoutAmount !== p.debtPayoutAmount
      )
    })
  }, [payroll, edits])

  // Recalculate payment values based on edits
  const getCalculatedPayment = (payment: Payment) => {
    const edit = edits[payment.id]
    if (!edit || !payroll) return payment

    const cycleDays = payroll.cycleDays || 14
    const dailyRate = payment.grossAmount / cycleDays
    const leaveCashoutAmount = Math.round(dailyRate * edit.leaveCashoutDays * 100) / 100
    const taxableAmount = payment.grossAmount + leaveCashoutAmount + edit.debtPayoutAmount
    const tdsAmount = Math.ceil(taxableAmount * payment.tdsRate / 100)
    const netBeforeRecovery = taxableAmount - tdsAmount

    const accountBalance = payment.lokwasi.accountBalance
    let accountDebitAmount = 0
    if (accountBalance < 0) {
      const amountOwed = Math.abs(accountBalance)
      accountDebitAmount = Math.min(amountOwed, netBeforeRecovery)
    }

    const netAmount = netBeforeRecovery - accountDebitAmount

    return {
      ...payment,
      leaveCashoutDays: edit.leaveCashoutDays,
      leaveCashoutAmount,
      debtPayoutAmount: edit.debtPayoutAmount,
      tdsAmount,
      accountDebitAmount,
      netAmount,
    }
  }

  // Calculate totals from edits
  const calculatedTotals = useMemo(() => {
    if (!payroll) return { totalGross: 0, totalTds: 0, totalNet: 0, totalDebtPayout: 0, totalLeaveCashout: 0 }
    return payroll.payments.reduce(
      (acc, p) => {
        const calc = getCalculatedPayment(p)
        return {
          totalGross: acc.totalGross + calc.grossAmount + calc.leaveCashoutAmount,
          totalTds: acc.totalTds + calc.tdsAmount,
          totalNet: acc.totalNet + calc.netAmount,
          totalDebtPayout: acc.totalDebtPayout + calc.debtPayoutAmount,
          totalLeaveCashout: acc.totalLeaveCashout + calc.leaveCashoutAmount,
        }
      },
      { totalGross: 0, totalTds: 0, totalNet: 0, totalDebtPayout: 0, totalLeaveCashout: 0 }
    )
  }, [payroll, edits])

  const isPending = payroll?.status === 'PENDING'

  // Use calculated totals for PENDING payrolls (reactive), server totals otherwise
  const displayTotals = isPending ? calculatedTotals : {
    totalGross: payroll?.totalGross || 0,
    totalTds: payroll?.totalTds || 0,
    totalNet: payroll?.totalNet || 0,
    totalDebtPayout: payroll?.totalDebtPayout || 0,
    totalLeaveCashout: payroll?.totalLeaveCashout || 0,
  }

  const updateEdit = (paymentId: string, field: keyof EditableValues, value: number) => {
    setEdits((prev) => ({
      ...prev,
      [paymentId]: { ...prev[paymentId], [field]: value },
    }))
  }

  const handleSaveChanges = async () => {
    if (!payroll || !hasUnsavedChanges) return

    setIsSaving(true)

    try {
      // Only send payments that changed
      const changedPayments = payroll.payments
        .filter((p) => {
          const edit = edits[p.id]
          return edit && (edit.leaveCashoutDays !== p.leaveCashoutDays || edit.debtPayoutAmount !== p.debtPayoutAmount)
        })
        .map((p) => ({
          paymentId: p.id,
          leaveCashoutDays: edits[p.id].leaveCashoutDays,
          debtPayoutAmount: edits[p.id].debtPayoutAmount,
        }))

      const response = await fetch(`/api/payroll/${id}/payments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments: changedPayments }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save changes')
      }

      const data = await response.json()
      setPayroll(data.payrollRun)
      // Re-initialize edits from saved data
      const newEdits: Record<string, EditableValues> = {}
      for (const p of data.payrollRun.payments) {
        newEdits[p.id] = {
          leaveCashoutDays: p.leaveCashoutDays,
          debtPayoutAmount: p.debtPayoutAmount,
        }
      }
      setEdits(newEdits)
      toast.success('Changes saved successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownload = async (type: 'axis' | 'neft') => {
    // Auto-save pending changes before download
    if (hasUnsavedChanges) {
      await handleSaveChanges()
    }

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
      toast.error('Failed to download Excel file')
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
      toast.error('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRerun = async () => {
    if (!confirm('This will create a new payroll run with fresh employee bank details and cancel this one. Continue?')) {
      return
    }
    setIsRerunning(true)
    try {
      const response = await fetch(`/api/payroll/${id}/rerun`, {
        method: 'POST',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to re-run payroll')
      }
      const data = await response.json()
      router.push(`/payroll/${data.payrollRun.id}`)
    } catch (err) {
      console.error('Re-run error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to re-run payroll')
    } finally {
      setIsRerunning(false)
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

  if (!payroll) {
    return (
      <>
        <Header title="Not Found" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Payroll run not found</p>
            <Link href="/payroll" className="text-primary hover:underline">
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
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Payroll
        </Link>

        {/* Info banner for PENDING payrolls */}
        {isPending && (
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Review the payments below. Adjust leave cashout or debt payout if needed, then download the Excel to process.
            </AlertDescription>
          </Alert>
        )}

        {/* Status & Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <StatusBadge status={payroll.status} />
            <span className="text-sm text-muted-foreground">
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
            {isPending && hasUnsavedChanges && (
              <Button
                onClick={handleSaveChanges}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </Button>
            )}
            {payroll.status === 'PROCESSED' && (
              <Button
                onClick={() => updateStatus('PAID')}
                disabled={isUpdating || isRerunning}
                className="bg-success text-white hover:bg-success/90"
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Mark as Paid
              </Button>
            )}
            {payroll.status !== 'PAID' && (
              <Button
                variant="outline"
                onClick={handleRerun}
                disabled={isUpdating || isRerunning}
                className="border-primary text-primary hover:bg-devalok-50"
              >
                {isRerunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Re-run with Fresh Data
              </Button>
            )}
            {payroll.status === 'PENDING' && (
              <Button
                variant="destructive"
                onClick={() => updateStatus('CANCELLED')}
                disabled={isUpdating || isRerunning}
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card className="rounded-none shadow-none py-0 gap-0">
            <CardContent className="p-4">
              <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                Employees
              </p>
              <p className="text-2xl font-semibold text-foreground">
                {payroll.employeeCount}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-none shadow-none py-0 gap-0">
            <CardContent className="p-4">
              <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                Total Gross
              </p>
              <p className="text-2xl font-semibold text-foreground">
                {formatCurrency(displayTotals.totalGross)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-none shadow-none py-0 gap-0">
            <CardContent className="p-4">
              <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                Leave Cashout
              </p>
              <p className="text-2xl font-semibold text-success">
                {formatCurrency(displayTotals.totalLeaveCashout)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-none shadow-none py-0 gap-0">
            <CardContent className="p-4">
              <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                Debt Payout
              </p>
              <p className="text-2xl font-semibold text-warning">
                {formatCurrency(displayTotals.totalDebtPayout)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-none shadow-none py-0 gap-0">
            <CardContent className="p-4">
              <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                Total TDS
              </p>
              <p className="text-2xl font-semibold text-muted-foreground">
                {formatCurrency(displayTotals.totalTds)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-none shadow-none py-0 gap-0 border-primary">
            <CardContent className="p-4">
              <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                Net Payout
              </p>
              <p className="text-2xl font-semibold text-primary">
                {formatCurrency(displayTotals.totalNet)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Download Buttons */}
        {(payroll.status === 'PENDING' || payroll.status === 'PROCESSED') && (
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
                  No Axis Bank account holders in this payroll
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
        <Card className="rounded-none shadow-none py-0 gap-0">
          <CardHeader className="px-6 py-4 border-b">
            <CardTitle className="text-sm">
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="px-4 py-3 text-xs tracking-wider uppercase text-muted-foreground">
                    Employee
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs tracking-wider uppercase text-muted-foreground">
                    Reference
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right text-xs tracking-wider uppercase text-muted-foreground">
                    Gross
                  </TableHead>
                  <TableHead className="px-4 py-3 text-center text-xs tracking-wider uppercase text-muted-foreground">
                    Leave Cashout
                  </TableHead>
                  <TableHead className="px-4 py-3 text-center text-xs tracking-wider uppercase text-muted-foreground">
                    Debt Payout
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right text-xs tracking-wider uppercase text-muted-foreground">
                    Recovery
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right text-xs tracking-wider uppercase text-muted-foreground">
                    TDS
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right text-xs tracking-wider uppercase text-muted-foreground">
                    Net
                  </TableHead>
                  <TableHead className="px-4 py-3 text-center text-xs tracking-wider uppercase text-muted-foreground">
                    Bank
                  </TableHead>
                  <TableHead className="px-4 py-3 text-center text-xs tracking-wider uppercase text-muted-foreground">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payroll.payments.map((payment) => {
                  const calc = isPending ? getCalculatedPayment(payment) : payment
                  const edit = edits[payment.id]
                  return (
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
                        {payment.customerReference}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right text-sm text-foreground">
                        {formatCurrency(payment.grossAmount)}
                      </TableCell>

                      {/* Leave Cashout - editable when PENDING */}
                      <TableCell className="px-4 py-4">
                        {isPending ? (
                          <div>
                            <div className="flex items-center justify-center gap-2">
                              <Input
                                type="number"
                                min={0}
                                max={payment.lokwasi.leaveBalance}
                                step={0.5}
                                value={edit?.leaveCashoutDays ?? 0}
                                onChange={(e) =>
                                  updateEdit(payment.id, 'leaveCashoutDays', parseFloat(e.target.value) || 0)
                                }
                                className="w-16 h-8 px-2 py-1 text-center text-sm"
                              />
                              <span className="text-xs text-muted-foreground">
                                / {payment.lokwasi.leaveBalance}
                              </span>
                            </div>
                            {calc.leaveCashoutAmount > 0 && (
                              <p className="text-xs text-center text-success mt-1">
                                +{formatCurrency(calc.leaveCashoutAmount)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-right text-sm">
                            {payment.leaveCashoutAmount > 0 ? (
                              <span className="text-success">
                                +{formatCurrency(payment.leaveCashoutAmount)}
                                <span className="text-xs block text-muted-foreground">
                                  ({payment.leaveCashoutDays} days)
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        )}
                      </TableCell>

                      {/* Debt Payout - editable when PENDING */}
                      <TableCell className="px-4 py-4">
                        {isPending ? (
                          <div>
                            <div className="flex items-center justify-center gap-2">
                              <Input
                                type="number"
                                min={0}
                                max={payment.lokwasi.salaryDebtBalance}
                                step={100}
                                value={edit?.debtPayoutAmount ?? 0}
                                onChange={(e) =>
                                  updateEdit(payment.id, 'debtPayoutAmount', parseFloat(e.target.value) || 0)
                                }
                                className="w-24 h-8 px-2 py-1 text-center text-sm"
                              />
                            </div>
                            {payment.lokwasi.salaryDebtBalance > 0 && (
                              <p className="text-xs text-center text-warning mt-1">
                                {formatCurrency(payment.lokwasi.salaryDebtBalance)} owed
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-right text-sm">
                            {payment.debtPayoutAmount > 0 ? (
                              <span className="text-warning">
                                +{formatCurrency(payment.debtPayoutAmount)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="px-4 py-4 text-right text-sm">
                        {calc.accountDebitAmount > 0 ? (
                          <span className="text-error">
                            -{formatCurrency(calc.accountDebitAmount)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right text-sm text-muted-foreground">
                        {formatCurrency(calc.tdsAmount)}
                        <span className="text-xs block">({payment.tdsRate}%)</span>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right font-semibold text-foreground">
                        {formatCurrency(calc.netAmount)}
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
                      <TableCell className="px-4 py-4 text-center">
                        <StatusBadge status={payment.paymentStatus} showIcon={false} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Metadata */}
        <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
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
