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
  Users,
} from 'lucide-react'

interface Lokwasi {
  id: string
  employeeCode: string
  name: string
  grossSalary: number
  tdsRate: number
  leaveBalance: number
  salaryDebtBalance: number
  accountBalance: number
  isAxisBank: boolean
  bankName: string
  status: string
  terminatedDate: string | null
  joinedDate: string
}

interface PaymentCalculation {
  lokwasiId: string
  name: string
  employeeCode: string
  grossSalary: number
  tdsRate: number
  leaveCashoutDays: number
  leaveCashoutAmount: number
  debtPayoutAmount: number
  accountDebitAmount: number
  totalGross: number
  tdsAmount: number
  netAmount: number
  isAxisBank: boolean
  bankName: string
  include: boolean
}

export default function NewPayrollPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [lokwasis, setLokwasis] = useState<Lokwasi[]>([])
  const [payments, setPayments] = useState<PaymentCalculation[]>([])
  const [runDate, setRunDate] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState('')

  useEffect(() => {
    fetchLokwasis()
  }, [])

  // Filter lokwasis eligible for a given run date
  // Includes ACTIVE lokwasis and TERMINATED lokwasis whose termination date is after the pay period start
  const getEligibleLokwasis = (allLokwasis: Lokwasi[], selectedRunDate: string) => {
    const runDateObj = new Date(selectedRunDate)
    // Pay period start = runDate - 14 days (default cycle)
    const periodStart = new Date(runDateObj)
    periodStart.setDate(periodStart.getDate() - 14)

    return allLokwasis.filter((l) => {
      // Must have joined by the run date
      if (new Date(l.joinedDate) > runDateObj) return false
      if (l.status === 'ACTIVE') return true
      if (l.status === 'TERMINATED' && l.terminatedDate) {
        return new Date(l.terminatedDate) > periodStart
      }
      return false
    })
  }

  const fetchLokwasis = async () => {
    try {
      const response = await fetch('/api/lokwasis')
      if (!response.ok) throw new Error('Failed to fetch lokwasis')
      const data = await response.json()
      // Store all lokwasis (ACTIVE + TERMINATED) for filtering by date
      const allLokwasis = data.lokwasis.filter(
        (l: Lokwasi) => l.status === 'ACTIVE' || l.status === 'TERMINATED'
      )
      setLokwasis(allLokwasis)

      // Filter eligible lokwasis based on selected run date
      const eligible = getEligibleLokwasis(allLokwasis, runDate)

      // Initialize payments with calculations
      const initialPayments = eligible.map((l: Lokwasi) => {
        const gross = Number(l.grossSalary)
        const tds = Math.ceil(gross * Number(l.tdsRate) / 100)
        const netBeforeRecovery = gross - tds
        const acctBal = Number(l.accountBalance || 0)
        const recovery = acctBal < 0 ? Math.min(Math.abs(acctBal), netBeforeRecovery) : 0
        return {
          lokwasiId: l.id,
          name: l.name,
          employeeCode: l.employeeCode,
          grossSalary: gross,
          tdsRate: Number(l.tdsRate),
          leaveCashoutDays: 0,
          leaveCashoutAmount: 0,
          debtPayoutAmount: 0,
          accountDebitAmount: recovery,
          totalGross: gross,
          tdsAmount: tds,
          netAmount: netBeforeRecovery - recovery,
          isAxisBank: l.isAxisBank,
          bankName: l.bankName,
          include: true,
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

  // Re-filter lokwasis when run date changes
  const handleRunDateChange = (newDate: string) => {
    setRunDate(newDate)
    if (lokwasis.length === 0) return

    const eligible = getEligibleLokwasis(lokwasis, newDate)
    const newPayments = eligible.map((l: Lokwasi) => {
      // Preserve existing payment data if lokwasi was already in the list
      const existing = payments.find((p) => p.lokwasiId === l.id)
      if (existing) return existing

      const gross = Number(l.grossSalary)
      const tds = Math.ceil(gross * Number(l.tdsRate) / 100)
      const netBeforeRecovery = gross - tds
      const acctBal = Number(l.accountBalance || 0)
      const recovery = acctBal < 0 ? Math.min(Math.abs(acctBal), netBeforeRecovery) : 0
      return {
        lokwasiId: l.id,
        name: l.name,
        employeeCode: l.employeeCode,
        grossSalary: gross,
        tdsRate: Number(l.tdsRate),
        leaveCashoutDays: 0,
        leaveCashoutAmount: 0,
        debtPayoutAmount: 0,
        accountDebitAmount: recovery,
        totalGross: gross,
        tdsAmount: tds,
        netAmount: netBeforeRecovery - recovery,
        isAxisBank: l.isAxisBank,
        bankName: l.bankName,
        include: true,
      }
    })
    setPayments(newPayments)
  }

  const calculatePayment = (payment: PaymentCalculation, lokwasiList: Lokwasi[]): PaymentCalculation => {
    const dailyRate = payment.grossSalary / 14
    const leaveCashoutAmount = Math.round(dailyRate * payment.leaveCashoutDays * 100) / 100
    // TDS applies to all payments: salary, leave cashout, and debt payout
    const taxableAmount = payment.grossSalary + leaveCashoutAmount + payment.debtPayoutAmount
    const tdsAmount = Math.ceil(taxableAmount * payment.tdsRate / 100)
    const netBeforeRecovery = taxableAmount - tdsAmount

    // Account recovery: if balance is negative, deduct from net pay
    const lokwasiData = lokwasiList.find((l) => l.id === payment.lokwasiId)
    const acctBal = lokwasiData ? Number(lokwasiData.accountBalance || 0) : 0
    const accountDebitAmount = acctBal < 0 ? Math.min(Math.abs(acctBal), netBeforeRecovery) : 0

    const netAmount = netBeforeRecovery - accountDebitAmount

    return {
      ...payment,
      leaveCashoutAmount,
      accountDebitAmount,
      totalGross: taxableAmount,
      tdsAmount,
      netAmount,
    }
  }

  const updatePayment = (
    lokwasiId: string,
    field: keyof PaymentCalculation,
    value: number | boolean
  ) => {
    setPayments((prev) =>
      prev.map((p) => {
        if (p.lokwasiId !== lokwasiId) return p
        const updated = { ...p, [field]: value }
        return calculatePayment(updated, lokwasis)
      })
    )
  }

  const includedPayments = payments.filter((p) => p.include)
  const totals = includedPayments.reduce(
    (acc, p) => ({
      totalGross: acc.totalGross + p.totalGross,
      totalTds: acc.totalTds + p.tdsAmount,
      totalNet: acc.totalNet + p.netAmount,
      totalLeaveCashout: acc.totalLeaveCashout + p.leaveCashoutAmount,
      totalDebtPayout: acc.totalDebtPayout + p.debtPayoutAmount,
    }),
    { totalGross: 0, totalTds: 0, totalNet: 0, totalLeaveCashout: 0, totalDebtPayout: 0 }
  )

  const handleCreate = async () => {
    if (includedPayments.length === 0) {
      setError('Please include at least one employee')
      return
    }

    setIsCreating(true)
    setError('')

    try {
      const response = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runDate,
          payments: includedPayments.map((p) => ({
            lokwasiId: p.lokwasiId,
            leaveCashoutDays: p.leaveCashoutDays,
            debtPayoutAmount: p.debtPayoutAmount,
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create payroll')
      }

      const data = await response.json()
      router.push(`/payroll/${data.payrollRun.id}`)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create payroll'
      setError(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <Header title="New Payroll Run" />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        </main>
      </>
    )
  }

  return (
    <>
      <Header title="New Payroll Run" />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Back link */}
        <Link
          href="/payroll"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Payroll
        </Link>

        {/* Progress Steps */}
        <div className="flex items-center gap-4 mb-8">
          {[
            { num: 1, label: 'Select Date' },
            { num: 2, label: 'Review Payments' },
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
                  Select Payroll Date
                </h2>
              </div>
              <div className="p-6">
                <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                  Run Date
                </label>
                <input
                  type="date"
                  value={runDate}
                  onChange={(e) => handleRunDateChange(e.target.value)}
                  className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                />
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  This is the date the payroll will be processed. Pay period will be the 14 days
                  ending on this date.
                </p>
              </div>
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

        {/* Step 2: Review Payments */}
        {step === 2 && (
          <div>
            <div className="bg-white border border-[var(--border)] mb-6">
              <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--muted-foreground)]" />
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">
                    Review & Adjust Payments
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
                          onChange={(e) =>
                            setPayments((prev) =>
                              prev.map((p) => ({ ...p, include: e.target.checked }))
                            )
                          }
                          className="w-4 h-4 accent-[var(--primary)]"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                        Employee
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                        Salary
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                        Leave Cashout
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-[var(--muted-foreground)]">
                        Debt Payout
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
                    {payments.map((payment) => {
                      const lokwasi = lokwasis.find((l) => l.id === payment.lokwasiId)
                      return (
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
                              {lokwasi?.status === 'TERMINATED' && (
                                <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-[var(--error-light)] text-[var(--error)] font-medium">
                                  TERMINATED
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {payment.employeeCode}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-right font-medium text-[var(--foreground)]">
                            {formatCurrency(payment.grossSalary)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max={lokwasi?.leaveBalance || 0}
                                step="0.5"
                                value={payment.leaveCashoutDays}
                                onChange={(e) =>
                                  updatePayment(
                                    payment.lokwasiId,
                                    'leaveCashoutDays',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                disabled={!payment.include}
                                className="w-16 px-2 py-1 border border-[var(--border)] text-center text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-[var(--muted)]"
                              />
                              <span className="text-xs text-[var(--muted-foreground)]">
                                / {lokwasi?.leaveBalance || 0}
                              </span>
                            </div>
                            {payment.leaveCashoutAmount > 0 && (
                              <p className="text-xs text-center text-[var(--success)] mt-1">
                                +{formatCurrency(payment.leaveCashoutAmount)}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max={lokwasi?.salaryDebtBalance || 0}
                                step="100"
                                value={payment.debtPayoutAmount}
                                onChange={(e) =>
                                  updatePayment(
                                    payment.lokwasiId,
                                    'debtPayoutAmount',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                disabled={!payment.include}
                                className="w-24 px-2 py-1 border border-[var(--border)] text-center text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-[var(--muted)]"
                              />
                            </div>
                            {(lokwasi?.salaryDebtBalance || 0) > 0 && (
                              <p className="text-xs text-center text-[var(--warning)] mt-1">
                                {formatCurrency(lokwasi?.salaryDebtBalance || 0)} owed
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-[var(--muted-foreground)]">
                            {formatCurrency(payment.tdsAmount)}
                            <p className="text-xs">({payment.tdsRate}%)</p>
                          </td>
                          <td className="px-4 py-4 text-right font-semibold text-[var(--foreground)]">
                            {formatCurrency(payment.netAmount)}
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
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white p-4 border border-[var(--border)]">
                <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                  Total Gross
                </p>
                <p className="text-xl font-semibold text-[var(--foreground)]">
                  {formatCurrency(totals.totalGross)}
                </p>
              </div>
              <div className="bg-white p-4 border border-[var(--border)]">
                <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                  Leave Cashout
                </p>
                <p className="text-xl font-semibold text-[var(--success)]">
                  {formatCurrency(totals.totalLeaveCashout)}
                </p>
              </div>
              <div className="bg-white p-4 border border-[var(--border)]">
                <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                  Debt Payout
                </p>
                <p className="text-xl font-semibold text-[var(--warning)]">
                  {formatCurrency(totals.totalDebtPayout)}
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
                className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white font-medium hover:bg-[var(--devalok-700)] transition-colors"
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
                  Confirm Payroll Run
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--muted-foreground)]">Run Date</span>
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
                  <span className="text-[var(--muted-foreground)]">Total Gross</span>
                  <span className="font-medium text-[var(--foreground)]">
                    {formatCurrency(totals.totalGross)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--muted-foreground)]">Total TDS</span>
                  <span className="font-medium text-[var(--foreground)]">
                    {formatCurrency(totals.totalTds)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--muted-foreground)]">Leave Cashout</span>
                  <span className="font-medium text-[var(--success)]">
                    {formatCurrency(totals.totalLeaveCashout)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--muted-foreground)]">Debt Payout</span>
                  <span className="font-medium text-[var(--warning)]">
                    {formatCurrency(totals.totalDebtPayout)}
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

            <div className="bg-[var(--muted)] p-4 mb-6">
              <p className="text-sm text-[var(--muted-foreground)]">
                <strong>What happens next:</strong> After creating the payroll run, you&apos;ll be
                able to download the Excel files for bank processing. The payroll will be marked
                as &quot;Pending&quot; until you confirm it&apos;s been paid.
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
                    Create Payroll Run
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
