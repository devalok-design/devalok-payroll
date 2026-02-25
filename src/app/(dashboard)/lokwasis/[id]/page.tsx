'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Header } from '@/components/layout/Header'
import { formatCurrency, maskAadhaar, maskBankAccount, formatDate } from '@/lib/utils'
import { INDIAN_BANKS, isAxisBankIFSC, getBankFromIFSC } from '@/lib/constants/banks'
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
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
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
  accountBalance: number
  status: string
  joinedDate: string
  terminatedDate: string | null
  createdAt: string
  updatedAt: string
}

interface AccountTransaction {
  id: string
  type: 'CREDIT' | 'DEBIT'
  category: string
  amount: number
  balanceAfter: number
  description: string
  isTaxable: boolean
  tdsRate: number | null
  tdsAmount: number | null
  transactionDate: string
  notes: string | null
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

function getAccountBalanceClasses(balance: number): { container: string; text: string } {
  if (balance < 0) {
    return { container: 'bg-error-light border-error', text: 'text-error' }
  }
  if (balance > 0) {
    return { container: 'bg-success-light border-success', text: 'text-success' }
  }
  return { container: 'bg-card border-border', text: 'text-foreground' }
}

function getAccountBalanceLabel(balance: number): string {
  if (balance < 0) return 'Owes company'
  if (balance > 0) return 'Company owes'
  return 'Settled'
}

export default function LokwasiDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const router = useRouter()
  const [lokwasi, setLokwasi] = useState<Lokwasi | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([])
  const [debtBreakdown, setDebtBreakdown] = useState<DebtBreakdown>({})
  const [accountTransactions, setAccountTransactions] = useState<AccountTransaction[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTerminating, setIsTerminating] = useState(false)
  const [showTerminateDialog, setShowTerminateDialog] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [editIfscCode, setEditIfscCode] = useState('')
  const [editBankName, setEditBankName] = useState('')
  const [editIsAxisBank, setEditIsAxisBank] = useState(false)

  const handleIfscChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase()
    setEditIfscCode(value)

    // Auto-detect Axis Bank
    const isAxis = isAxisBankIFSC(value)
    setEditIsAxisBank(isAxis)

    // Auto-suggest bank name from IFSC
    if (value.length >= 4) {
      const detectedBank = getBankFromIFSC(value)
      if (detectedBank) {
        setEditBankName(detectedBank)
      }
    }
  }

  useEffect(() => {
    fetchLokwasi()
  }, [id])

  // Initialize edit state when lokwasi data is loaded
  useEffect(() => {
    if (lokwasi) {
      setEditIfscCode(lokwasi.ifscCode)
      setEditBankName(lokwasi.bankName)
      setEditIsAxisBank(lokwasi.isAxisBank)
    }
  }, [lokwasi])

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
      setAccountTransactions(data.accountTransactions || [])
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
      ifscCode: editIfscCode,
      bankName: editBankName,
      beneficiaryNickname: formData.get('beneficiaryNickname') as string,
      isAxisBank: editIsAxisBank,
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
        toast.error('Failed to save changes')
        return
      }

      const updated = await response.json()
      setLokwasi(updated.lokwasi)
      setIsEditing(false)
      toast.success('Changes saved successfully')
    } catch {
      setErrors({ general: 'An error occurred. Please try again.' })
      toast.error('An error occurred. Please try again.')
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
        toast.error(error.message || 'Failed to terminate lokwasi')
        return
      }

      // Refresh the data
      await fetchLokwasi()
      setShowTerminateDialog(false)
      toast.success('Lokwasi terminated successfully')
    } catch {
      setErrors({ general: 'An error occurred. Please try again.' })
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsTerminating(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <Header title="Loading..." />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading lokwasi...</div>
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
            <p className="text-muted-foreground mb-4">Lokwasi not found</p>
            <Link href="/lokwasis" className="text-primary hover:underline">
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
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
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
          <StatusBadge status={lokwasi.status} />
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
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            {/* Personal Information */}
            <Card className="rounded-none shadow-none py-0 gap-0 mb-6">
              <CardHeader className="px-6 py-4 border-b border-border flex-row items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-sm">
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted-foreground mb-2">
                    Full Name
                  </label>
                  <Input
                    name="name"
                    type="text"
                    defaultValue={lokwasi.name}
                    required
                    className="h-12"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted-foreground mb-2">
                    PAN Number
                  </label>
                  <Input
                    name="pan"
                    type="text"
                    defaultValue={lokwasi.pan}
                    required
                    maxLength={10}
                    className="h-12 uppercase"
                  />
                  {errors.pan && (
                    <p className="mt-1 text-sm text-error">{errors.pan}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted-foreground mb-2">
                    Aadhaar Number
                  </label>
                  <Input
                    name="aadhaar"
                    type="text"
                    defaultValue={lokwasi.aadhaar}
                    required
                    maxLength={14}
                    className="h-12"
                  />
                  {errors.aadhaar && (
                    <p className="mt-1 text-sm text-error">{errors.aadhaar}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted-foreground mb-2">
                    Nature of Work
                  </label>
                  <Input
                    name="natureOfWork"
                    type="text"
                    defaultValue={lokwasi.natureOfWork}
                    className="h-12"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted-foreground mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue={lokwasi.status}
                    className="w-full px-4 h-12 border border-input bg-background focus:outline-none focus:border-ring"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Bank Details */}
            <Card className="rounded-none shadow-none py-0 gap-0 mb-6">
              <CardHeader className="px-6 py-4 border-b border-border flex-row items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-sm">
                  Bank Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted-foreground mb-2">
                    IFSC Code
                  </label>
                  <Input
                    name="ifscCode"
                    type="text"
                    value={editIfscCode}
                    onChange={handleIfscChange}
                    required
                    maxLength={11}
                    className="h-12 uppercase"
                  />
                  {errors.ifscCode && (
                    <p className="mt-1 text-sm text-error">{errors.ifscCode}</p>
                  )}
                  {editIsAxisBank && (
                    <p className="mt-1 text-xs text-success">
                      Axis Bank detected - will use within-bank transfer
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted-foreground mb-2">
                    Bank Name
                  </label>
                  <select
                    name="bankName"
                    value={editBankName}
                    onChange={(e) => setEditBankName(e.target.value)}
                    required
                    className="w-full px-4 h-12 border border-input bg-background focus:outline-none focus:border-ring"
                  >
                    <option value="">Select a bank</option>
                    {INDIAN_BANKS.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted-foreground mb-2">
                    Account Number
                  </label>
                  <Input
                    name="bankAccount"
                    type="text"
                    defaultValue={lokwasi.bankAccount}
                    required
                    className="h-12"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted-foreground mb-2">
                    Beneficiary Nickname
                  </label>
                  <Input
                    name="beneficiaryNickname"
                    type="text"
                    defaultValue={lokwasi.beneficiaryNickname}
                    required
                    className="h-12 uppercase"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      name="isAxisBank"
                      type="checkbox"
                      checked={editIsAxisBank}
                      onChange={(e) => setEditIsAxisBank(e.target.checked)}
                      className="w-5 h-5 border border-input accent-primary"
                    />
                    <span className="text-sm text-foreground">
                      This is an Axis Bank account
                    </span>
                  </label>
                  <p className="mt-1 ml-8 text-xs text-muted-foreground">
                    Auto-detected from IFSC code (UTIB prefix). Override if needed.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Compensation */}
            <Card className="rounded-none shadow-none py-0 gap-0 mb-6">
              <CardHeader className="px-6 py-4 border-b border-border flex-row items-center gap-2">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-sm">
                  Compensation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted-foreground mb-2">
                    Bi-weekly Salary (&#8377;)
                  </label>
                  <Input
                    name="grossSalary"
                    type="number"
                    defaultValue={lokwasi.grossSalary}
                    required
                    min="0"
                    step="0.01"
                    className="h-12"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted-foreground mb-2">
                    TDS Rate (%)
                  </label>
                  <Input
                    name="tdsRate"
                    type="number"
                    defaultValue={lokwasi.tdsRate}
                    min="0"
                    max="100"
                    step="0.01"
                    className="h-12"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted-foreground mb-2">
                    Leave Balance (Days)
                  </label>
                  <Input
                    name="leaveBalance"
                    type="number"
                    defaultValue={lokwasi.leaveBalance}
                    min="0"
                    step="0.5"
                    className="h-12"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted-foreground mb-2">
                    Salary Debt Balance (&#8377;)
                  </label>
                  <Input
                    name="salaryDebtBalance"
                    type="number"
                    defaultValue={lokwasi.salaryDebtBalance}
                    min="0"
                    step="0.01"
                    className="h-12"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Button type="submit" disabled={isSaving} size="lg">
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setIsEditing(false)}
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="max-w-4xl">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <Card className="rounded-none shadow-none py-0 gap-0">
                <CardContent className="p-4">
                  <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                    Bi-weekly Salary
                  </p>
                  <p className="text-xl font-semibold text-foreground">
                    {formatCurrency(lokwasi.grossSalary)}
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-none shadow-none py-0 gap-0">
                <CardContent className="p-4">
                  <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                    TDS Rate
                  </p>
                  <p className="text-xl font-semibold text-foreground">
                    {lokwasi.tdsRate}%
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-none shadow-none py-0 gap-0">
                <CardContent className="p-4">
                  <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                    Leave Balance
                  </p>
                  <p className="text-xl font-semibold text-foreground">
                    {lokwasi.leaveBalance} days
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-none shadow-none py-0 gap-0">
                <CardContent className="p-4">
                  <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                    Salary Debt
                  </p>
                  <p className={`text-xl font-semibold ${lokwasi.salaryDebtBalance > 0 ? 'text-warning' : 'text-foreground'}`}>
                    {formatCurrency(lokwasi.salaryDebtBalance)}
                  </p>
                </CardContent>
              </Card>
              <div className={`p-4 border ${getAccountBalanceClasses(lokwasi.accountBalance).container}`}>
                <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                  Account Balance
                </p>
                <p className={`text-xl font-semibold ${getAccountBalanceClasses(lokwasi.accountBalance).text}`}>
                  {lokwasi.accountBalance < 0 ? '-' : ''}{formatCurrency(Math.abs(lokwasi.accountBalance))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {getAccountBalanceLabel(lokwasi.accountBalance)}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            {lokwasi.status === 'ACTIVE' && (
              <div className="flex items-center gap-3 mb-6">
                <Button asChild>
                  <Link href={`/lokwasis/${lokwasi.id}/manual-payment`}>
                    <Banknote className="w-4 h-4" />
                    Record Manual Payment
                  </Link>
                </Button>
              </div>
            )}

            {/* Negative Balance Warning */}
            {lokwasi.accountBalance < 0 && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This lokwasi has an outstanding advance of {formatCurrency(Math.abs(lokwasi.accountBalance))}.
                  {lokwasi.status === 'ACTIVE'
                    ? ' This will be automatically deducted from the next payroll.'
                    : ' This amount is pending recovery.'}
                </AlertDescription>
              </Alert>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Personal Information */}
              <Card className="rounded-none shadow-none py-0 gap-0">
                <CardHeader className="px-6 py-4 border-b border-border flex-row items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-sm">
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                      PAN Number
                    </p>
                    <p className="text-foreground font-mono">{lokwasi.pan}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                      Aadhaar Number
                    </p>
                    <p className="text-foreground font-mono">
                      {maskAadhaar(lokwasi.aadhaar)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                      Nature of Work
                    </p>
                    <p className="text-foreground">{lokwasi.natureOfWork}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                      Joined Date
                    </p>
                    <p className="text-foreground">
                      {new Date(lokwasi.joinedDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Bank Details */}
              <Card className="rounded-none shadow-none py-0 gap-0">
                <CardHeader className="px-6 py-4 border-b border-border flex-row items-center gap-2">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-sm">
                    Bank Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                      Bank Name
                    </p>
                    <p className="text-foreground">
                      {lokwasi.bankName}
                      {lokwasi.isAxisBank && (
                        <Badge variant="info" className="ml-2">AXIS</Badge>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                      Account Number
                    </p>
                    <p className="text-foreground font-mono">
                      {maskBankAccount(lokwasi.bankAccount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                      IFSC Code
                    </p>
                    <p className="text-foreground font-mono">{lokwasi.ifscCode}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                      Beneficiary Nickname
                    </p>
                    <p className="text-foreground font-mono">
                      {lokwasi.beneficiaryNickname}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Debt Breakdown */}
            {lokwasi.salaryDebtBalance > 0 && (
              <Card className="rounded-none shadow-none py-0 gap-0 mb-6">
                <CardHeader className="px-6 py-4 border-b border-border flex-row items-center gap-2">
                  <Banknote className="w-4 h-4 text-warning" />
                  <CardTitle className="text-sm">
                    Debt Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Debt by source */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {debtBreakdown.SALARY && debtBreakdown.SALARY > 0 && (
                      <div className="p-4 bg-muted border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <Landmark className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                            Salary
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-warning">
                          {formatCurrency(debtBreakdown.SALARY)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          From proprietorship
                        </p>
                      </div>
                    )}
                    {debtBreakdown.LEAVE_CASHOUT && debtBreakdown.LEAVE_CASHOUT > 0 && (
                      <div className="p-4 bg-muted border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                            Leave Cashout
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-warning">
                          {formatCurrency(debtBreakdown.LEAVE_CASHOUT)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Pending encashment
                        </p>
                      </div>
                    )}
                    {debtBreakdown.BONUS && debtBreakdown.BONUS > 0 && (
                      <div className="p-4 bg-muted border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <Gift className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                            Bonus
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-warning">
                          {formatCurrency(debtBreakdown.BONUS)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Pending bonus
                        </p>
                      </div>
                    )}
                    {debtBreakdown.OTHER && debtBreakdown.OTHER > 0 && (
                      <div className="p-4 bg-muted border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                            Other
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-warning">
                          {formatCurrency(debtBreakdown.OTHER)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Miscellaneous
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="flex items-center justify-between p-4 bg-warning-light border border-warning/20">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Total Outstanding Debt
                      </p>
                      {debtBreakdown.paid && debtBreakdown.paid > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Total added: {formatCurrency(debtBreakdown.total || 0)} | Paid off: {formatCurrency(debtBreakdown.paid)}
                        </p>
                      )}
                    </div>
                    <p className="text-xl font-semibold text-warning">
                      {formatCurrency(lokwasi.salaryDebtBalance)}
                    </p>
                  </div>

                  {/* Debt payment history */}
                  {debtPayments.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-3">
                        Debt Transaction History
                      </h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {debtPayments.map((dp) => (
                          <div
                            key={dp.id}
                            className="flex items-center justify-between py-2 px-3 bg-muted text-sm"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  dp.isAddition ? 'bg-warning' : 'bg-success'
                                }`}
                              />
                              <span className="text-foreground">
                                {dp.isAddition ? 'Added' : 'Paid'}: {dp.source.replace('_', ' ')}
                                {dp.sourceYear && ` (${dp.sourceYear})`}
                              </span>
                            </div>
                            <div className="text-right">
                              <span
                                className={`font-medium ${
                                  dp.isAddition ? 'text-warning' : 'text-success'
                                }`}
                              >
                                {dp.isAddition ? '+' : '-'}{formatCurrency(dp.amount)}
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(dp.paymentDate)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment History */}
            <Card className="rounded-none shadow-none py-0 gap-0">
              <CardHeader className="px-6 py-4 border-b border-border flex-row items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-sm">
                  Payment History
                </CardTitle>
              </CardHeader>
              {payments.length === 0 ? (
                <CardContent className="p-6 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No payments yet</p>
                </CardContent>
              ) : (
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="px-6 py-4 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {new Date(payment.payrollRun.runDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>Gross: {formatCurrency(payment.grossAmount)}</span>
                            <span>TDS: {formatCurrency(payment.tdsAmount)}</span>
                            {payment.leaveCashoutAmount > 0 && (
                              <span className="text-success">
                                +Leave: {formatCurrency(payment.leaveCashoutAmount)}
                              </span>
                            )}
                            {payment.debtPayoutAmount > 0 && (
                              <span className="text-warning">
                                +Debt: {formatCurrency(payment.debtPayoutAmount)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">
                            {formatCurrency(payment.netAmount)}
                          </p>
                          <StatusBadge status={payment.paymentStatus} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Account Statement */}
            {accountTransactions.length > 0 && (
              <Card className="rounded-none shadow-none py-0 gap-0 mt-6">
                <CardHeader className="px-6 py-4 border-b border-border flex-row items-center gap-2">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-sm">
                    Account Statement
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {accountTransactions.map((txn) => (
                      <div
                        key={txn.id}
                        className="px-6 py-4 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {txn.description}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{formatDate(txn.transactionDate)}</span>
                            <Badge variant="outline" className="text-xs">
                              {txn.category.replace(/_/g, ' ')}
                            </Badge>
                            {txn.isTaxable && txn.tdsAmount && (
                              <span>TDS: {formatCurrency(txn.tdsAmount)}</span>
                            )}
                          </div>
                          {txn.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{txn.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            txn.type === 'CREDIT' ? 'text-success' : 'text-error'
                          }`}>
                            {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Bal: {txn.balanceAfter < 0 ? '-' : ''}{formatCurrency(Math.abs(txn.balanceAfter))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <div className="mt-6 flex items-center gap-6 text-xs text-muted-foreground">
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
