'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { formatCurrency } from '@/lib/utils'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle,
  Download,
  Loader2,
  Wallet,
} from 'lucide-react'

interface Lokwasi {
  id: string
  employeeCode: string
  name: string
  salaryDebtBalance: number
  tdsRate: number
  isAxisBank: boolean
  bankName: string
}

interface DebtPaymentCalculation {
  lokwasiId: string
  name: string
  employeeCode: string
  salaryDebtBalance: number
  tdsRate: number
  amount: number
  tdsAmount: number
  netAmount: number
  isAxisBank: boolean
  bankName: string
  include: boolean
}

export default function ProcessDebtPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [lokwasis, setLokwasis] = useState<Lokwasi[]>([])
  const [payments, setPayments] = useState<DebtPaymentCalculation[]>([])
  const [runDate, setRunDate] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState('')

  useEffect(() => {
    fetchLokwasis()
  }, [])

  const fetchLokwasis = async () => {
    try {
      const response = await fetch('/api/lokwasis')
      if (!response.ok) throw new Error('Failed to fetch lokwasis')
      const data = await response.json()

      // Filter lokwasis with outstanding debt
      const lokwasisWithDebt = data.lokwasis.filter(
        (l: Lokwasi & { status: string }) =>
          l.status === 'ACTIVE' && Number(l.salaryDebtBalance) > 0
      )
      setLokwasis(lokwasisWithDebt)

      // Initialize payments
      const initialPayments = lokwasisWithDebt.map((l: Lokwasi) => {
        const balance = Number(l.salaryDebtBalance)
        const tdsRate = Number(l.tdsRate)
        return {
          lokwasiId: l.id,
          name: l.name,
          employeeCode: l.employeeCode,
          salaryDebtBalance: balance,
          tdsRate,
          amount: 0,
          tdsAmount: 0,
          netAmount: 0,
          isAxisBank: l.isAxisBank,
          bankName: l.bankName,
          include: false,
        }
      })
      setPayments(initialPayments)
    } catch (err) {
      setError('Failed to load employees')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const calculatePayment = (payment: DebtPaymentCalculation): DebtPaymentCalculation => {
    // TDS is calculated on debt payout (taxable salary)
    const tdsAmount = Math.ceil(payment.amount * payment.tdsRate / 100)
    const netAmount = payment.amount - tdsAmount

    return {
      ...payment,
      tdsAmount,
      netAmount,
    }
  }

  const updatePayment = (
    lokwasiId: string,
    field: keyof DebtPaymentCalculation,
    value: number | boolean
  ) => {
    setPayments((prev) =>
      prev.map((p) => {
        if (p.lokwasiId !== lokwasiId) return p
        const updated = { ...p, [field]: value }

        // Auto-include when amount is set
        if (field === 'amount' && typeof value === 'number' && value > 0) {
          updated.include = true
        }
        // Reset amount when unchecked
        if (field === 'include' && value === false) {
          updated.amount = 0
        }

        return calculatePayment(updated)
      })
    )
  }

  const setFullBalance = (lokwasiId: string) => {
    setPayments((prev) =>
      prev.map((p) => {
        if (p.lokwasiId !== lokwasiId) return p
        const updated = { ...p, amount: p.salaryDebtBalance, include: true }
        return calculatePayment(updated)
      })
    )
  }

  const includedPayments = payments.filter((p) => p.include && p.amount > 0)
  const totals = includedPayments.reduce(
    (acc, p) => ({
      totalGross: acc.totalGross + p.amount,
      totalTds: acc.totalTds + p.tdsAmount,
      totalNet: acc.totalNet + p.netAmount,
    }),
    { totalGross: 0, totalTds: 0, totalNet: 0 }
  )

  const axisCount = includedPayments.filter((p) => p.isAxisBank).length
  const neftCount = includedPayments.filter((p) => !p.isAxisBank).length

  const handleCreate = async () => {
    if (includedPayments.length === 0) {
      setError('Please include at least one employee with a debt amount')
      return
    }

    // Validate amounts don't exceed balances
    const invalidPayments = includedPayments.filter(
      (p) => p.amount > p.salaryDebtBalance
    )
    if (invalidPayments.length > 0) {
      setError(
        `Amount exceeds balance for: ${invalidPayments.map((p) => p.name).join(', ')}`
      )
      return
    }

    setIsCreating(true)
    setError('')

    try {
      const response = await fetch('/api/debt-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runDate,
          payments: includedPayments.map((p) => ({
            lokwasiId: p.lokwasiId,
            amount: p.amount,
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create debt run')
      }

      const data = await response.json()
      router.push(`/debts/runs/${data.debtRun.id}`)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create debt run'
      setError(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <Header title="Process Debt Payments" />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        </main>
      </>
    )
  }

  if (lokwasis.length === 0) {
    return (
      <>
        <Header title="Process Debt Payments" />
        <main className="flex-1 overflow-y-auto p-6">
          <Link
            href="/debts"
            className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Debts
          </Link>

          <div className="max-w-xl mx-auto text-center py-12">
            <Wallet className="w-16 h-16 mx-auto mb-4 text-[var(--muted-foreground)]" />
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
              No Outstanding Debts
            </h2>
            <p className="text-[var(--muted-foreground)]">
              There are no employees with outstanding salary debts to process.
            </p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header title="Process Debt Payments" />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Back link */}
        <Link
          href="/debts"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Debts
        </Link>

        {/* Progress Steps */}
        <div className="flex items-center gap-4 mb-8">
          {[
            { num: 1, label: 'Select Date' },
            { num: 2, label: 'Select Amounts' },
            { num: 3, label: 'Confirm' },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div
                className={`w-8 h-8 flex items-center justify-center font-medium text-sm ${
                  step >= s.num
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                }`}
              >
                {step > s.num ? <CheckCircle className="w-4 h-4" /> : s.num}
              </div>
              <span
                className={`ml-2 text-sm ${
                  step >= s.num ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'
                }`}
              >
                {s.label}
              </span>
              {i < 2 && (
                <ArrowRight className="w-4 h-4 mx-4 text-[var(--muted-foreground)]" />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[var(--error-light)] border border-[var(--error)] text-[var(--error)]">
            {error}
          </div>
        )}

        {/* Step 1: Select Date */}
        {step === 1 && (
          <div className="max-w-xl">
            <div className="bg-white border border-[var(--border)]">
              <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--muted-foreground)]" />
                <h2 className="text-sm font-semibold text-[var(--foreground)]">
                  Select Payment Date
                </h2>
              </div>
              <div className="p-6">
                <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                  Run Date
                </label>
                <input
                  type="date"
                  value={runDate}
                  onChange={(e) => setRunDate(e.target.value)}
                  className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                />
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  This is the date the debt payments will be processed.
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-[var(--warning-light)] border border-[var(--warning)]">
              <p className="text-sm text-[var(--warning)]">
                <strong>Note:</strong> TDS will be deducted from debt payments as they are taxable salary amounts.
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white font-medium hover:bg-[var(--devalok-700)] transition-colors"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Amounts */}
        {step === 2 && (
          <div>
            <div className="bg-white border border-[var(--border)] mb-6">
              <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[var(--muted-foreground)]" />
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">
                    Select Debt Amounts to Pay
                  </h2>
                </div>
                <span className="text-sm text-[var(--muted-foreground)]">
                  {includedPayments.length} of {payments.length} employees selected
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={includedPayments.length === payments.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Select all with full balance
                              setPayments((prev) =>
                                prev.map((p) => calculatePayment({
                                  ...p,
                                  include: true,
                                  amount: p.salaryDebtBalance,
                                }))
                              )
                            } else {
                              // Deselect all
                              setPayments((prev) =>
                                prev.map((p) => ({
                                  ...p,
                                  include: false,
                                  amount: 0,
                                  tdsAmount: 0,
                                  netAmount: 0,
                                }))
                              )
                            }
                          }}
                          className="w-4 h-4 accent-[var(--primary)]"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                        Employee
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                        Outstanding Debt
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                        Amount to Pay
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {payments.map((payment) => (
                      <tr
                        key={payment.lokwasiId}
                        className={`${
                          payment.include ? '' : 'bg-[var(--muted)] opacity-50'
                        } transition-colors`}
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={payment.include}
                            onChange={(e) =>
                              updatePayment(payment.lokwasiId, 'include', e.target.checked)
                            }
                            className="w-4 h-4 accent-[var(--primary)]"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-[var(--foreground)]">
                            {payment.name}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {payment.employeeCode}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-semibold text-[var(--warning)]">
                            {formatCurrency(payment.salaryDebtBalance)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max={payment.salaryDebtBalance}
                              step="100"
                              value={payment.amount || ''}
                              onChange={(e) =>
                                updatePayment(
                                  payment.lokwasiId,
                                  'amount',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder="0"
                              className="w-28 px-2 py-1 border border-[var(--border)] text-right text-sm focus:outline-none focus:border-[var(--primary)]"
                            />
                            <button
                              onClick={() => setFullBalance(payment.lokwasiId)}
                              className="text-xs px-2 py-1 bg-[var(--muted)] hover:bg-[var(--border)] transition-colors"
                              title="Pay full balance"
                            >
                              Full
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right text-sm text-[var(--muted-foreground)]">
                          {payment.amount > 0 ? (
                            <>
                              {formatCurrency(payment.tdsAmount)}
                              <p className="text-xs">({payment.tdsRate}%)</p>
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-[var(--foreground)]">
                          {payment.amount > 0 ? formatCurrency(payment.netAmount) : '-'}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {payment.isAxisBank ? (
                            <span className="text-xs px-1.5 py-0.5 bg-[var(--info)] text-white">
                              AXIS
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--muted-foreground)]">
                              NEFT
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 border border-[var(--border)]">
                <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                  Gross Amount
                </p>
                <p className="text-xl font-semibold text-[var(--foreground)]">
                  {formatCurrency(totals.totalGross)}
                </p>
              </div>
              <div className="bg-white p-4 border border-[var(--border)]">
                <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                  Total TDS
                </p>
                <p className="text-xl font-semibold text-[var(--muted-foreground)]">
                  {formatCurrency(totals.totalTds)}
                </p>
              </div>
              <div className="bg-white p-4 border border-[var(--border)] border-[var(--primary)]">
                <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                  Net Payout
                </p>
                <p className="text-xl font-semibold text-[var(--primary)]">
                  {formatCurrency(totals.totalNet)}
                </p>
              </div>
              <div className="bg-white p-4 border border-[var(--border)]">
                <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                  By Bank Type
                </p>
                <p className="text-sm">
                  <span className="text-[var(--info)]">{axisCount} Axis</span>
                  {' • '}
                  <span className="text-[var(--muted-foreground)]">{neftCount} NEFT</span>
                </p>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-6 py-3 border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--muted)] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={includedPayments.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white font-medium hover:bg-[var(--devalok-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="max-w-2xl">
            <div className="bg-white border border-[var(--border)] mb-6">
              <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                <h2 className="text-sm font-semibold text-[var(--foreground)]">
                  Confirm Debt Payment Run
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--muted-foreground)]">Payment Date</span>
                  <span className="font-medium text-[var(--foreground)]">
                    {new Date(runDate).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--muted-foreground)]">Employees</span>
                  <span className="font-medium text-[var(--foreground)]">
                    {includedPayments.length}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--muted-foreground)]">Gross Debt Amount</span>
                  <span className="font-medium text-[var(--foreground)]">
                    {formatCurrency(totals.totalGross)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--muted-foreground)]">TDS Deducted</span>
                  <span className="font-medium text-[var(--foreground)]">
                    {formatCurrency(totals.totalTds)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--muted-foreground)]">Bank Breakdown</span>
                  <span className="font-medium text-[var(--foreground)]">
                    {axisCount > 0 && `${axisCount} Axis`}
                    {axisCount > 0 && neftCount > 0 && ' • '}
                    {neftCount > 0 && `${neftCount} NEFT`}
                  </span>
                </div>
                <div className="flex justify-between py-3 bg-[var(--devalok-50)] -mx-6 px-6">
                  <span className="font-semibold text-[var(--foreground)]">Net Payout</span>
                  <span className="font-bold text-[var(--primary)] text-xl">
                    {formatCurrency(totals.totalNet)}
                  </span>
                </div>
              </div>
            </div>

            {/* Employee breakdown */}
            <div className="bg-white border border-[var(--border)] mb-6">
              <div className="px-6 py-4 border-b border-[var(--border)]">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  Payment Details
                </h3>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {includedPayments.map((p) => (
                  <div key={p.lokwasiId} className="px-6 py-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{p.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Debt: {formatCurrency(p.amount)} → Net: {formatCurrency(p.netAmount)}
                      </p>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 ${
                      p.isAxisBank
                        ? 'bg-[var(--info)] text-white'
                        : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                    }`}>
                      {p.isAxisBank ? 'AXIS' : 'NEFT'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[var(--muted)] p-4 mb-6">
              <p className="text-sm text-[var(--muted-foreground)]">
                <strong>What happens next:</strong> After creating the debt run, you&apos;ll be
                able to download the Excel files for bank processing. The TDS will be added to
                the monthly TDS report when marked as paid.
              </p>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-6 py-3 border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--muted)] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white font-medium hover:bg-[var(--devalok-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Create Debt Run
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
