'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Header } from '@/components/layout/Header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
      toast.error('Failed to load employees')
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
      toast.error('Please include at least one employee')
      return
    }

    setIsCreating(true)

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
      toast.error(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <Header title="Off-Cycle Payroll" />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </>
    )
  }

  return (
    <>
      <Header title="Off-Cycle Payroll" />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Back link */}
        <Link
          href="/payroll"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Payroll
        </Link>

        {/* Info note */}
        <div className="mb-6 p-4 bg-info-light border border-info text-sm text-neutral-700">
          Use this for off-schedule payrolls. Routine payrolls are auto-generated every 14 days and can be reviewed from the <Link href="/payroll" className="underline text-primary">payroll list</Link>.
        </div>

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
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > s.num ? <CheckCircle className="w-4 h-4" /> : s.num}
              </div>
              <span
                className={`ml-2 text-sm ${
                  step >= s.num ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
              {i < 2 && (
                <ArrowRight className="w-4 h-4 mx-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Date */}
        {step === 1 && (
          <div className="max-w-xl">
            <Card className="rounded-none shadow-none py-0 gap-0">
              <CardHeader className="flex-row items-center gap-2 border-b py-4 px-6">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  Select Payroll Date
                </h2>
              </CardHeader>
              <CardContent className="p-6">
                <label className="block text-xs font-medium tracking-wider uppercase text-muted-foreground mb-2">
                  Run Date
                </label>
                <Input
                  type="date"
                  value={runDate}
                  onChange={(e) => handleRunDateChange(e.target.value)}
                  className="h-12"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  This is the date the payroll will be processed. Pay period will be the 14 days
                  ending on this date.
                </p>
              </CardContent>
            </Card>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setStep(2)} size="lg">
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Review Payments */}
        {step === 2 && (
          <div>
            <Card className="rounded-none shadow-none py-0 gap-0 mb-6">
              <CardHeader className="flex-row items-center justify-between border-b py-4 px-6">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Review & Adjust Payments
                  </h2>
                </div>
                <span className="text-sm text-muted-foreground">
                  {includedPayments.length} of {payments.length} employees selected
                </span>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={includedPayments.length === payments.length}
                          onChange={(e) =>
                            setPayments((prev) =>
                              prev.map((p) => ({ ...p, include: e.target.checked }))
                            )
                          }
                          className="w-4 h-4 accent-primary"
                        />
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                        Employee
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                        Salary
                      </TableHead>
                      <TableHead className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                        Leave Cashout
                      </TableHead>
                      <TableHead className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                        Debt Payout
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                        TDS
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                        Recovery
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                        Net
                      </TableHead>
                      <TableHead className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                        Bank
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => {
                      const lokwasi = lokwasis.find((l) => l.id === payment.lokwasiId)
                      return (
                        <TableRow
                          key={payment.lokwasiId}
                          className={payment.include ? '' : 'bg-muted opacity-50'}
                        >
                          <TableCell className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={payment.include}
                              onChange={(e) =>
                                updatePayment(payment.lokwasiId, 'include', e.target.checked)
                              }
                              className="w-4 h-4 accent-primary"
                            />
                          </TableCell>
                          <TableCell className="px-4 py-4">
                            <p className="font-medium text-foreground">
                              {payment.name}
                              {lokwasi?.status === 'TERMINATED' && (
                                <Badge variant="destructive" className="ml-2 text-[10px]">
                                  TERMINATED
                                </Badge>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {payment.employeeCode}
                            </p>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-right font-medium text-foreground">
                            {formatCurrency(payment.grossSalary)}
                          </TableCell>
                          <TableCell className="px-4 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <Input
                                type="number"
                                min={0}
                                max={lokwasi?.leaveBalance || 0}
                                step={0.5}
                                value={payment.leaveCashoutDays}
                                onChange={(e) =>
                                  updatePayment(
                                    payment.lokwasiId,
                                    'leaveCashoutDays',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                disabled={!payment.include}
                                className="w-16 px-2 py-1 h-auto text-center text-sm"
                              />
                              <span className="text-xs text-muted-foreground">
                                / {lokwasi?.leaveBalance || 0}
                              </span>
                            </div>
                            {payment.leaveCashoutAmount > 0 && (
                              <p className="text-xs text-center text-success mt-1">
                                +{formatCurrency(payment.leaveCashoutAmount)}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <Input
                                type="number"
                                min={0}
                                max={lokwasi?.salaryDebtBalance || 0}
                                step={100}
                                value={payment.debtPayoutAmount}
                                onChange={(e) =>
                                  updatePayment(
                                    payment.lokwasiId,
                                    'debtPayoutAmount',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                disabled={!payment.include}
                                className="w-24 px-2 py-1 h-auto text-center text-sm"
                              />
                            </div>
                            {(lokwasi?.salaryDebtBalance || 0) > 0 && (
                              <p className="text-xs text-center text-warning mt-1">
                                {formatCurrency(lokwasi?.salaryDebtBalance || 0)} owed
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-4 text-right text-sm text-muted-foreground">
                            {formatCurrency(payment.tdsAmount)}
                            <p className="text-xs">({payment.tdsRate}%)</p>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-right text-sm">
                            {payment.accountDebitAmount > 0 ? (
                              <span className="text-error">
                                -{formatCurrency(payment.accountDebitAmount)}
                                <span className="text-xs block text-muted-foreground">
                                  advance
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-4 text-right font-semibold text-foreground">
                            {formatCurrency(payment.netAmount)}
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center">
                            {payment.isAxisBank ? (
                              <Badge variant="info">AXIS</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                NEFT
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Totals */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <Card className="rounded-none shadow-none py-0 gap-0">
                <CardContent className="p-4">
                  <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                    Total Gross
                  </p>
                  <p className="text-xl font-semibold text-foreground">
                    {formatCurrency(totals.totalGross)}
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-none shadow-none py-0 gap-0">
                <CardContent className="p-4">
                  <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                    Leave Cashout
                  </p>
                  <p className="text-xl font-semibold text-success">
                    {formatCurrency(totals.totalLeaveCashout)}
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-none shadow-none py-0 gap-0">
                <CardContent className="p-4">
                  <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                    Debt Payout
                  </p>
                  <p className="text-xl font-semibold text-warning">
                    {formatCurrency(totals.totalDebtPayout)}
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-none shadow-none py-0 gap-0">
                <CardContent className="p-4">
                  <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                    Total TDS
                  </p>
                  <p className="text-xl font-semibold text-muted-foreground">
                    {formatCurrency(totals.totalTds)}
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-none shadow-none py-0 gap-0 border-primary">
                <CardContent className="p-4">
                  <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                    Net Payout
                  </p>
                  <p className="text-xl font-semibold text-primary">
                    {formatCurrency(totals.totalNet)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" size="lg" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button size="lg" onClick={() => setStep(3)}>
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="max-w-2xl">
            <Card className="rounded-none shadow-none py-0 gap-0 mb-6">
              <CardHeader className="flex-row items-center gap-2 border-b py-4 px-6">
                <CheckCircle className="w-4 h-4 text-success" />
                <h2 className="text-sm font-semibold text-foreground">
                  Confirm Payroll Run
                </h2>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Run Date</span>
                  <span className="font-medium text-foreground">
                    {new Date(runDate).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Employees</span>
                  <span className="font-medium text-foreground">
                    {includedPayments.length}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Total Gross</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(totals.totalGross)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Total TDS</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(totals.totalTds)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Leave Cashout</span>
                  <span className="font-medium text-success">
                    {formatCurrency(totals.totalLeaveCashout)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Debt Payout</span>
                  <span className="font-medium text-warning">
                    {formatCurrency(totals.totalDebtPayout)}
                  </span>
                </div>
                <div className="flex justify-between py-3 bg-devalok-50 -mx-6 px-6">
                  <span className="font-semibold text-foreground">Net Payout</span>
                  <span className="font-bold text-primary text-xl">
                    {formatCurrency(totals.totalNet)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="bg-muted p-4 mb-6">
              <p className="text-sm text-muted-foreground">
                <strong>What happens next:</strong> After creating the payroll run, you&apos;ll be
                able to download the Excel files for bank processing. The payroll will be marked
                as &quot;Pending&quot; until you confirm it&apos;s been paid.
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" size="lg" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button size="lg" onClick={handleCreate} disabled={isCreating}>
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
              </Button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
