'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { formatCurrency } from '@/lib/utils'
import {
  ArrowLeft,
  Banknote,
  CheckCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Lokwasi {
  id: string
  name: string
  employeeCode: string
  tdsRate: number
  grossSalary: number
  accountBalance: number
  bankAccount: string
  bankName: string
}

const CATEGORIES = [
  { value: 'ADVANCE_SALARY', label: 'Advance Salary', description: 'Salary paid in advance (will be deducted from next payroll)', defaultTaxable: true },
  { value: 'BONUS', label: 'Bonus / Incentive', description: 'Performance bonus or incentive payment', defaultTaxable: true },
  { value: 'REIMBURSEMENT', label: 'Reimbursement', description: 'Expense reimbursement (not taxable)', defaultTaxable: false },
  { value: 'LOAN_DISBURSEMENT', label: 'Loan Disbursement', description: 'Loan given to employee (will be recovered from future payrolls)', defaultTaxable: false },
  { value: 'ADJUSTMENT', label: 'Adjustment', description: 'Manual balance correction', defaultTaxable: false },
]

export default function ManualPaymentPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const router = useRouter()
  const [lokwasi, setLokwasi] = useState<Lokwasi | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form state
  const [category, setCategory] = useState('ADVANCE_SALARY')
  const [grossAmount, setGrossAmount] = useState('')
  const [isTaxable, setIsTaxable] = useState(true)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchLokwasi()
  }, [id])

  const fetchLokwasi = async () => {
    try {
      const response = await fetch(`/api/lokwasis/${id}`)
      if (!response.ok) {
        router.push('/lokwasis')
        return
      }
      const data = await response.json()
      setLokwasi(data.lokwasi)
    } catch {
      setError('Failed to load employee details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory)
    const cat = CATEGORIES.find((c) => c.value === newCategory)
    if (cat) {
      setIsTaxable(cat.defaultTaxable)
    }
  }

  // Calculate preview
  const amount = parseFloat(grossAmount) || 0
  const tdsRate = isTaxable && lokwasi ? lokwasi.tdsRate : 0
  const tdsAmount = isTaxable ? Math.ceil(amount * tdsRate / 100) : 0
  const netAmount = amount - tdsAmount

  // Determine impact on account balance
  const isDebit = category === 'ADVANCE_SALARY' || category === 'LOAN_DISBURSEMENT'
  const balanceImpact = isDebit ? -amount : amount
  const projectedBalance = lokwasi ? lokwasi.accountBalance + balanceImpact : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/manual-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lokwasiId: id,
          category,
          grossAmount: amount,
          isTaxable,
          notes: notes || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create payment')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(`/lokwasis/${id}`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payment')
    } finally {
      setIsSubmitting(false)
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

  if (!lokwasi) return null

  if (success) {
    return (
      <>
        <Header title="Payment Created" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-[var(--success)]" />
            <h2 className="text-xl font-semibold mb-2">Payment Recorded</h2>
            <p className="text-[var(--muted-foreground)]">
              {formatCurrency(netAmount)} will be paid to {lokwasi.name}
            </p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">Redirecting...</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header title={`Manual Payment - ${lokwasi.name}`} />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Back Button */}
        <Link
          href={`/lokwasis/${lokwasi.id}`}
          className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {lokwasi.name}
        </Link>

        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Banknote className="w-6 h-6 text-[var(--primary)]" />
            <div>
              <h1 className="text-xl font-semibold text-[var(--foreground)]">
                Record Manual Payment
              </h1>
              <p className="text-sm text-[var(--muted-foreground)]">
                {lokwasi.name} ({lokwasi.employeeCode}) - Current balance: {lokwasi.accountBalance < 0 ? '-' : ''}{formatCurrency(Math.abs(lokwasi.accountBalance))}
              </p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {/* Payment Type */}
            <div className="mb-6">
              <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-3">
                Payment Type
              </label>
              <div className="grid grid-cols-1 gap-2">
                {CATEGORIES.map((cat) => (
                  <label
                    key={cat.value}
                    className={`flex items-start gap-3 p-4 border cursor-pointer transition-colors ${
                      category === cat.value
                        ? 'border-[var(--primary)] bg-[var(--devalok-50)]'
                        : 'border-[var(--border)] hover:bg-[var(--muted)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={cat.value}
                      checked={category === cat.value}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{cat.label}</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{cat.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div className="mb-6">
              <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                Gross Amount (₹)
              </label>
              <input
                type="number"
                value={grossAmount}
                onChange={(e) => setGrossAmount(e.target.value)}
                min="1"
                step="1"
                required
                placeholder="Enter amount"
                className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)] text-lg font-mono"
              />
            </div>

            {/* Taxable */}
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTaxable}
                  onChange={(e) => setIsTaxable(e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <p className="font-medium text-[var(--foreground)]">Apply TDS ({lokwasi.tdsRate}%)</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Tax will be deducted at source
                  </p>
                </div>
              </label>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Add a note about this payment..."
                className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)] resize-none"
              />
            </div>

            {/* Preview */}
            {amount > 0 && (
              <div className="mb-6 p-4 bg-[var(--muted)] border border-[var(--border)]">
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Payment Preview</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Gross Amount</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                  {isTaxable && tdsAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--muted-foreground)]">TDS ({tdsRate}%)</span>
                      <span className="font-medium text-[var(--muted-foreground)]">-{formatCurrency(tdsAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-[var(--border)]">
                    <span className="font-semibold">Net to Pay</span>
                    <span className="font-semibold text-[var(--primary)]">{formatCurrency(netAmount)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[var(--border)]">
                    <span className="text-[var(--muted-foreground)]">Account Balance After</span>
                    <span className={`font-medium ${
                      projectedBalance < 0 ? 'text-[var(--error)]' : projectedBalance > 0 ? 'text-[var(--success)]' : ''
                    }`}>
                      {projectedBalance < 0 ? '-' : ''}{formatCurrency(Math.abs(projectedBalance))}
                      {projectedBalance < 0 && (
                        <span className="text-xs ml-1">(owes company)</span>
                      )}
                    </span>
                  </div>
                  {isDebit && projectedBalance < 0 && (
                    <p className="text-xs text-[var(--warning)] mt-2">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      This amount will be automatically recovered from the next payroll.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={isSubmitting || amount <= 0}
                className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white font-medium hover:bg-[var(--devalok-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Banknote className="w-4 h-4" />
                )}
                {isSubmitting ? 'Processing...' : 'Record Payment'}
              </button>
              <Link
                href={`/lokwasis/${lokwasi.id}`}
                className="px-6 py-3 border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--muted)] transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </>
  )
}
