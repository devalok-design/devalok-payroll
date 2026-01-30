'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { formatCurrency, maskAadhaar, maskBankAccount, formatDate } from '@/lib/utils'
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  User,
  CreditCard,
  Wallet,
  Calendar,
  FileText,
  History,
  UserX,
  AlertTriangle,
  Loader2,
  Banknote,
  Landmark,
  Gift,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Lokwasi {
  id: string
  employeeCode: string
  name: string
  pan: string
  aadhaar: string
  bankAccount: string
  ifscCode: string
  bankName: string
  beneficiaryNickname: string
  isAxisBank: boolean
  tdsRate: number
  grossSalary: number
  natureOfWork: string
  leaveBalance: number
  initialLeaveBalance: number
  salaryDebtBalance: number
  status: string
  joinedDate: string
  terminatedDate: string | null
  createdAt: string
  updatedAt: string
}

interface Payment {
  id: string
  grossAmount: number
  tdsAmount: number
  netAmount: number
  leaveCashoutAmount: number
  debtPayoutAmount: number
  paymentStatus: string
  paidAt: string | null
  payrollRun: {
    runDate: string
    status: string
  }
}

interface DebtPayment {
  id: string
  amount: number
  balanceAfter: number
  source: 'SALARY' | 'LEAVE_CASHOUT' | 'BONUS' | 'OTHER'
  sourceYear: number | null
  isAddition: boolean
  paymentDate: string
  notes: string | null
}

interface DebtBreakdown {
  SALARY?: number
  LEAVE_CASHOUT?: number
  BONUS?: number
  OTHER?: number
  total?: number
  paid?: number
}

export default function LokwasiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [lokwasi, setLokwasi] = useState<Lokwasi | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([])
  const [debtBreakdown, setDebtBreakdown] = useState<DebtBreakdown>({})
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTerminating, setIsTerminating] = useState(false)
  const [showTerminateDialog, setShowTerminateDialog] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchLokwasi()
  }, [id])

  const fetchLokwasi = async () => {
    try {
      const response = await fetch(`/api/lokwasis/${id}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/lokwasis')
          return
        }
        throw new Error('Failed to fetch lokwasi')
      }
      const data = await response.json()
      setLokwasi(data.lokwasi)
      setPayments(data.payments || [])
      setDebtPayments(data.debtPayments || [])
      setDebtBreakdown(data.debtBreakdown || {})
    } catch (error) {
      console.error('Error fetching lokwasi:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    setErrors({})

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      pan: (formData.get('pan') as string).toUpperCase(),
      aadhaar: (formData.get('aadhaar') as string).replace(/\s/g, ''),
      bankAccount: formData.get('bankAccount') as string,
      ifscCode: (formData.get('ifscCode') as string).toUpperCase(),
      bankName: formData.get('bankName') as string,
      beneficiaryNickname: formData.get('beneficiaryNickname') as string,
      isAxisBank: formData.get('isAxisBank') === 'true',
      tdsRate: parseFloat(formData.get('tdsRate') as string) || 10,
      grossSalary: parseFloat(formData.get('grossSalary') as string),
      natureOfWork: formData.get('natureOfWork') as string,
      leaveBalance: parseFloat(formData.get('leaveBalance') as string) || 0,
      salaryDebtBalance: parseFloat(formData.get('salaryDebtBalance') as string) || 0,
      status: formData.get('status') as string,
    }

    try {
      const response = await fetch(`/api/lokwasis/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        if (error.errors) {
          setErrors(error.errors)
        } else {
          setErrors({ general: error.message || 'Failed to update lokwasi' })
        }
        return
      }

      const updated = await response.json()
      setLokwasi(updated.lokwasi)
      setIsEditing(false)
    } catch {
      setErrors({ general: 'An error occurred. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTerminate = async () => {
    setIsTerminating(true)
    try {
      const response = await fetch(`/api/lokwasis/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        setErrors({ general: error.message || 'Failed to terminate lokwasi' })
        return
      }

      // Refresh the data
      await fetchLokwasi()
      setShowTerminateDialog(false)
    } catch {
      setErrors({ general: 'An error occurred. Please try again.' })
    } finally {
      setIsTerminating(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <Header title="Loading..." />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-[var(--muted-foreground)]">Loading lokwasi...</div>
        </main>
      </>
    )
  }

  if (!lokwasi) {
    return (
      <>
        <Header title="Not Found" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[var(--muted-foreground)] mb-4">Lokwasi not found</p>
            <Link href="/lokwasis" className="text-[var(--primary)] hover:underline">
              Back to Lokwasis
            </Link>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header title={lokwasi.name} />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Back link and actions */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/lokwasis"
            className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lokwasis
          </Link>
          {!isEditing && (
            <div className="flex items-center gap-3">
              {lokwasi.status !== 'TERMINATED' && (
                <Button
                  variant="outline"
                  onClick={() => setShowTerminateDialog(true)}
                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Terminate
                </Button>
              )}
              <Button onClick={() => setIsEditing(true)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
          )}
        </div>

        {/* Terminated Alert */}
        {lokwasi.status === 'TERMINATED' && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This lokwasi was terminated on{' '}
              {lokwasi.terminatedDate
                ? formatDate(lokwasi.terminatedDate)
                : 'an unknown date'}
              . They will not appear in future payrolls.
            </AlertDescription>
          </Alert>
        )}

        {/* Employee Code and Status */}
        <div className="flex items-center gap-4 mb-6">
          <span className="text-sm font-medium text-muted-foreground">
            {lokwasi.employeeCode}
          </span>
          <Badge
            variant={
              lokwasi.status === 'ACTIVE'
                ? 'default'
                : lokwasi.status === 'INACTIVE'
                ? 'secondary'
                : 'destructive'
            }
          >
            {lokwasi.status}
          </Badge>
        </div>

        {/* Terminate Confirmation Dialog */}
        <Dialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Terminate {lokwasi.name}?</DialogTitle>
              <DialogDescription>
                This will mark {lokwasi.name} as terminated. They will no longer
                appear in future payrolls. This action can be undone by editing
                their status back to Active.
              </DialogDescription>
            </DialogHeader>
            {errors.general && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowTerminateDialog(false)}
                disabled={isTerminating}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleTerminate}
                disabled={isTerminating}
              >
                {isTerminating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Terminating...
                  </>
                ) : (
                  <>
                    <UserX className="mr-2 h-4 w-4" />
                    Terminate
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {isEditing ? (
          <form onSubmit={handleSave} className="max-w-4xl">
            {errors.general && (
              <div className="mb-6 p-4 bg-[var(--error-light)] border border-[var(--error)] text-[var(--error)]">
                {errors.general}
              </div>
            )}

            {/* Personal Information */}
            <div className="bg-white border border-[var(--border)] mb-6">
              <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
                <User className="w-4 h-4 text-[var(--muted-foreground)]" />
                <h2 className="text-sm font-semibold text-[var(--foreground)]">
                  Personal Information
                </h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                    Full Name
                  </label>
                  <input
                    name="name"
                    type="text"
                    defaultValue={lokwasi.name}
                    required
                    className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                    PAN Number
                  </label>
                  <input
                    name="pan"
                    type="text"
                    defaultValue={lokwasi.pan}
                    required
                    maxLength={10}
                    className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)] uppercase"
                  />
                  {errors.pan && (
                    <p className="mt-1 text-sm text-[var(--error)]">{errors.pan}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                    Aadhaar Number
                  </label>
                  <input
                    name="aadhaar"
                    type="text"
                    defaultValue={lokwasi.aadhaar}
                    required
                    maxLength={14}
                    className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                  />
                  {errors.aadhaar && (
                    <p className="mt-1 text-sm text-[var(--error)]">{errors.aadhaar}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                    Nature of Work
                  </label>
                  <input
                    name="natureOfWork"
                    type="text"
                    defaultValue={lokwasi.natureOfWork}
                    className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue={lokwasi.status}
                    className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="bg-white border border-[var(--border)] mb-6">
              <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[var(--muted-foreground)]" />
                <h2 className="text-sm font-semibold text-[var(--foreground)]">
                  Bank Details
                </h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                    Bank Name
                  </label>
                  <input
                    name="bankName"
                    type="text"
                    defaultValue={lokwasi.bankName}
                    required
                    className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                    Account Number
                  </label>
                  <input
                    name="bankAccount"
                    type="text"
                    defaultValue={lokwasi.bankAccount}
                    required
                    className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                    IFSC Code
                  </label>
                  <input
                    name="ifscCode"
                    type="text"
                    defaultValue={lokwasi.ifscCode}
                    required
                    maxLength={11}
                    className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)] uppercase"
                  />
                  {errors.ifscCode && (
                    <p className="mt-1 text-sm text-[var(--error)]">{errors.ifscCode}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                    Beneficiary Nickname
                  </label>
                  <input
                    name="beneficiaryNickname"
                    type="text"
                    defaultValue={lokwasi.beneficiaryNickname}
                    required
                    className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)] uppercase"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      name="isAxisBank"
                      type="checkbox"
                      value="true"
                      defaultChecked={lokwasi.isAxisBank}
                      className="w-5 h-5 border border-[var(--border)] accent-[var(--primary)]"
                    />
                    <span className="text-sm text-[var(--foreground)]">
                      This is an Axis Bank account
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Compensation */}
            <div className="bg-white border border-[var(--border)] mb-6">
              <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[var(--muted-foreground)]" />
                <h2 className="text-sm font-semibold text-[var(--foreground)]">
                  Compensation
                </h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                    Bi-weekly Salary (₹)
                  </label>
                  <input
                    name="grossSalary"
                    type="number"
                    defaultValue={lokwasi.grossSalary}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                    TDS Rate (%)
                  </label>
                  <input
                    name="tdsRate"
                    type="number"
                    defaultValue={lokwasi.tdsRate}
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                    Leave Balance (Days)
                  </label>
                  <input
                    name="leaveBalance"
                    type="number"
                    defaultValue={lokwasi.leaveBalance}
                    min="0"
                    step="0.5"
                    className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                    Salary Debt Balance (₹)
                  </label>
                  <input
                    name="salaryDebtBalance"
                    type="number"
                    defaultValue={lokwasi.salaryDebtBalance}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white font-medium hover:bg-[var(--devalok-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 px-6 py-3 border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--muted)] transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="max-w-4xl">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 border border-[var(--border)]">
                <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                  Bi-weekly Salary
                </p>
                <p className="text-xl font-semibold text-[var(--foreground)]">
                  {formatCurrency(lokwasi.grossSalary)}
                </p>
              </div>
              <div className="bg-white p-4 border border-[var(--border)]">
                <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                  TDS Rate
                </p>
                <p className="text-xl font-semibold text-[var(--foreground)]">
                  {lokwasi.tdsRate}%
                </p>
              </div>
              <div className="bg-white p-4 border border-[var(--border)]">
                <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                  Leave Balance
                </p>
                <p className="text-xl font-semibold text-[var(--foreground)]">
                  {lokwasi.leaveBalance} days
                </p>
              </div>
              <div className="bg-white p-4 border border-[var(--border)]">
                <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                  Salary Debt
                </p>
                <p className={`text-xl font-semibold ${lokwasi.salaryDebtBalance > 0 ? 'text-[var(--warning)]' : 'text-[var(--foreground)]'}`}>
                  {formatCurrency(lokwasi.salaryDebtBalance)}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Personal Information */}
              <div className="bg-white border border-[var(--border)]">
                <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
                  <User className="w-4 h-4 text-[var(--muted-foreground)]" />
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">
                    Personal Information
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                      PAN Number
                    </p>
                    <p className="text-[var(--foreground)] font-mono">{lokwasi.pan}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                      Aadhaar Number
                    </p>
                    <p className="text-[var(--foreground)] font-mono">
                      {maskAadhaar(lokwasi.aadhaar)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                      Nature of Work
                    </p>
                    <p className="text-[var(--foreground)]">{lokwasi.natureOfWork}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                      Joined Date
                    </p>
                    <p className="text-[var(--foreground)]">
                      {new Date(lokwasi.joinedDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="bg-white border border-[var(--border)]">
                <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[var(--muted-foreground)]" />
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">
                    Bank Details
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                      Bank Name
                    </p>
                    <p className="text-[var(--foreground)]">
                      {lokwasi.bankName}
                      {lokwasi.isAxisBank && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 bg-[var(--info)] text-white">
                          AXIS
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                      Account Number
                    </p>
                    <p className="text-[var(--foreground)] font-mono">
                      {maskBankAccount(lokwasi.bankAccount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                      IFSC Code
                    </p>
                    <p className="text-[var(--foreground)] font-mono">{lokwasi.ifscCode}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                      Beneficiary Nickname
                    </p>
                    <p className="text-[var(--foreground)] font-mono">
                      {lokwasi.beneficiaryNickname}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Debt Breakdown */}
            {lokwasi.salaryDebtBalance > 0 && (
              <div className="bg-white border border-[var(--border)] mb-6">
                <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-[var(--warning)]" />
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">
                    Debt Breakdown
                  </h2>
                </div>
                <div className="p-6">
                  {/* Debt by source */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {debtBreakdown.SALARY && debtBreakdown.SALARY > 0 && (
                      <div className="p-4 bg-[var(--muted)] border border-[var(--border)]">
                        <div className="flex items-center gap-2 mb-2">
                          <Landmark className="w-4 h-4 text-[var(--muted-foreground)]" />
                          <span className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)]">
                            Salary
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-[var(--warning)]">
                          {formatCurrency(debtBreakdown.SALARY)}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          From proprietorship
                        </p>
                      </div>
                    )}
                    {debtBreakdown.LEAVE_CASHOUT && debtBreakdown.LEAVE_CASHOUT > 0 && (
                      <div className="p-4 bg-[var(--muted)] border border-[var(--border)]">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-[var(--muted-foreground)]" />
                          <span className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)]">
                            Leave Cashout
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-[var(--warning)]">
                          {formatCurrency(debtBreakdown.LEAVE_CASHOUT)}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Pending encashment
                        </p>
                      </div>
                    )}
                    {debtBreakdown.BONUS && debtBreakdown.BONUS > 0 && (
                      <div className="p-4 bg-[var(--muted)] border border-[var(--border)]">
                        <div className="flex items-center gap-2 mb-2">
                          <Gift className="w-4 h-4 text-[var(--muted-foreground)]" />
                          <span className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)]">
                            Bonus
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-[var(--warning)]">
                          {formatCurrency(debtBreakdown.BONUS)}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Pending bonus
                        </p>
                      </div>
                    )}
                    {debtBreakdown.OTHER && debtBreakdown.OTHER > 0 && (
                      <div className="p-4 bg-[var(--muted)] border border-[var(--border)]">
                        <div className="flex items-center gap-2 mb-2">
                          <HelpCircle className="w-4 h-4 text-[var(--muted-foreground)]" />
                          <span className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)]">
                            Other
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-[var(--warning)]">
                          {formatCurrency(debtBreakdown.OTHER)}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Miscellaneous
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="flex items-center justify-between p-4 bg-[var(--warning-light)] border border-[var(--warning)]/20">
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        Total Outstanding Debt
                      </p>
                      {debtBreakdown.paid && debtBreakdown.paid > 0 && (
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Total added: {formatCurrency(debtBreakdown.total || 0)} | Paid off: {formatCurrency(debtBreakdown.paid)}
                        </p>
                      )}
                    </div>
                    <p className="text-xl font-semibold text-[var(--warning)]">
                      {formatCurrency(lokwasi.salaryDebtBalance)}
                    </p>
                  </div>

                  {/* Debt payment history */}
                  {debtPayments.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-3">
                        Debt Transaction History
                      </h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {debtPayments.map((dp) => (
                          <div
                            key={dp.id}
                            className="flex items-center justify-between py-2 px-3 bg-[var(--muted)] text-sm"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  dp.isAddition ? 'bg-[var(--warning)]' : 'bg-[var(--success)]'
                                }`}
                              />
                              <span className="text-[var(--foreground)]">
                                {dp.isAddition ? 'Added' : 'Paid'}: {dp.source.replace('_', ' ')}
                                {dp.sourceYear && ` (${dp.sourceYear})`}
                              </span>
                            </div>
                            <div className="text-right">
                              <span
                                className={`font-medium ${
                                  dp.isAddition ? 'text-[var(--warning)]' : 'text-[var(--success)]'
                                }`}
                              >
                                {dp.isAddition ? '+' : '-'}{formatCurrency(dp.amount)}
                              </span>
                              <p className="text-xs text-[var(--muted-foreground)]">
                                {formatDate(dp.paymentDate)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment History */}
            <div className="bg-white border border-[var(--border)]">
              <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
                <History className="w-4 h-4 text-[var(--muted-foreground)]" />
                <h2 className="text-sm font-semibold text-[var(--foreground)]">
                  Payment History
                </h2>
              </div>
              {payments.length === 0 ? (
                <div className="p-6 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-[var(--muted-foreground)]" />
                  <p className="text-[var(--muted-foreground)]">No payments yet</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="px-6 py-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-[var(--foreground)]">
                          {new Date(payment.payrollRun.runDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-[var(--muted-foreground)]">
                          <span>Gross: {formatCurrency(payment.grossAmount)}</span>
                          <span>TDS: {formatCurrency(payment.tdsAmount)}</span>
                          {payment.leaveCashoutAmount > 0 && (
                            <span className="text-[var(--success)]">
                              +Leave: {formatCurrency(payment.leaveCashoutAmount)}
                            </span>
                          )}
                          {payment.debtPayoutAmount > 0 && (
                            <span className="text-[var(--warning)]">
                              +Debt: {formatCurrency(payment.debtPayoutAmount)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[var(--foreground)]">
                          {formatCurrency(payment.netAmount)}
                        </p>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 ${
                            payment.paymentStatus === 'PAID'
                              ? 'bg-[var(--success-light)] text-[var(--success)]'
                              : payment.paymentStatus === 'FAILED'
                              ? 'bg-[var(--error-light)] text-[var(--error)]'
                              : 'bg-[var(--warning-light)] text-[var(--warning)]'
                          }`}
                        >
                          {payment.paymentStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="mt-6 flex items-center gap-6 text-xs text-[var(--muted-foreground)]">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Created: {new Date(lokwasi.createdAt).toLocaleDateString('en-IN')}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Updated: {new Date(lokwasi.updatedAt).toLocaleDateString('en-IN')}
              </span>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
