'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save } from 'lucide-react'
import { INDIAN_BANKS, isAxisBankIFSC, getBankFromIFSC } from '@/lib/constants/banks'

export default function NewLokwasiPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [ifscCode, setIfscCode] = useState('')
  const [bankName, setBankName] = useState('')
  const [isAxisBank, setIsAxisBank] = useState(false)

  const handleIfscChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase()
    setIfscCode(value)

    // Auto-detect Axis Bank
    const isAxis = isAxisBankIFSC(value)
    setIsAxisBank(isAxis)

    // Auto-suggest bank name from IFSC
    if (value.length >= 4) {
      const detectedBank = getBankFromIFSC(value)
      if (detectedBank) {
        setBankName(detectedBank)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      pan: (formData.get('pan') as string).toUpperCase(),
      aadhaar: (formData.get('aadhaar') as string).replace(/\s/g, ''),
      bankAccount: formData.get('bankAccount') as string,
      ifscCode: ifscCode,
      bankName: bankName,
      beneficiaryNickname: formData.get('beneficiaryNickname') as string,
      isAxisBank: isAxisBank,
      tdsRate: parseFloat(formData.get('tdsRate') as string) || 10,
      grossSalary: parseFloat(formData.get('grossSalary') as string),
      natureOfWork: formData.get('natureOfWork') as string || 'Professional Services',
      leaveBalance: parseFloat(formData.get('leaveBalance') as string) || 0,
      salaryDebtBalance: parseFloat(formData.get('salaryDebtBalance') as string) || 0,
      joinedDate: formData.get('joinedDate') as string,
    }

    try {
      const response = await fetch('/api/lokwasis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        if (error.errors) {
          setErrors(error.errors)
        } else {
          setErrors({ general: error.message || 'Failed to create lokwasi' })
        }
        return
      }

      router.push('/lokwasis')
      router.refresh()
    } catch {
      setErrors({ general: 'An error occurred. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Header title="Add New Lokwasi" />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Back link */}
        <Link
          href="/lokwasis"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Lokwasis
        </Link>

        <form onSubmit={handleSubmit} className="max-w-3xl">
          {errors.general && (
            <div className="mb-6 p-4 bg-error-light border border-error text-error">
              {errors.general}
            </div>
          )}

          {/* Personal Information */}
          <Card className="mb-6 gap-0 rounded-none py-0 shadow-none">
            <CardHeader className="border-b px-6 py-4">
              <CardTitle className="text-sm">
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Label className="text-xs tracking-wider uppercase text-muted-foreground mb-2">
                    Full Name *
                  </Label>
                  <Input
                    name="name"
                    type="text"
                    required
                    className="h-12"
                    placeholder="e.g., Yogin Naidu"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-error">{errors.name}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs tracking-wider uppercase text-muted-foreground mb-2">
                    PAN Number *
                  </Label>
                  <Input
                    name="pan"
                    type="text"
                    required
                    maxLength={10}
                    className="h-12 uppercase"
                    placeholder="AAAAA0000A"
                  />
                  {errors.pan && (
                    <p className="mt-1 text-sm text-error">{errors.pan}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs tracking-wider uppercase text-muted-foreground mb-2">
                    Aadhaar Number *
                  </Label>
                  <Input
                    name="aadhaar"
                    type="text"
                    required
                    maxLength={14}
                    className="h-12"
                    placeholder="0000 0000 0000"
                  />
                  {errors.aadhaar && (
                    <p className="mt-1 text-sm text-error">{errors.aadhaar}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs tracking-wider uppercase text-muted-foreground mb-2">
                    Joined Date *
                  </Label>
                  <Input
                    name="joinedDate"
                    type="date"
                    required
                    className="h-12"
                  />
                </div>

                <div>
                  <Label className="text-xs tracking-wider uppercase text-muted-foreground mb-2">
                    Nature of Work
                  </Label>
                  <Input
                    name="natureOfWork"
                    type="text"
                    defaultValue="Professional Services"
                    className="h-12"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card className="mb-6 gap-0 rounded-none py-0 shadow-none">
            <CardHeader className="border-b px-6 py-4">
              <CardTitle className="text-sm">
                Bank Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs tracking-wider uppercase text-muted-foreground mb-2">
                    IFSC Code *
                  </Label>
                  <Input
                    name="ifscCode"
                    type="text"
                    required
                    maxLength={11}
                    value={ifscCode}
                    onChange={handleIfscChange}
                    className="h-12 uppercase"
                    placeholder="e.g., SBIN0009019"
                  />
                  {errors.ifscCode && (
                    <p className="mt-1 text-sm text-error">{errors.ifscCode}</p>
                  )}
                  {isAxisBank && (
                    <p className="mt-1 text-xs text-success">
                      Axis Bank detected - will use within-bank transfer
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-xs tracking-wider uppercase text-muted-foreground mb-2">
                    Bank Name *
                  </Label>
                  <select
                    name="bankName"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-4 py-3 border border-border bg-white focus:outline-none focus:border-primary"
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
                  <Label className="text-xs tracking-wider uppercase text-muted-foreground mb-2">
                    Account Number *
                  </Label>
                  <Input
                    name="bankAccount"
                    type="text"
                    required
                    className="h-12"
                    placeholder="e.g., 30209006571"
                  />
                </div>

                <div>
                  <Label className="text-xs tracking-wider uppercase text-muted-foreground mb-2">
                    Beneficiary Nickname *
                  </Label>
                  <Input
                    name="beneficiaryNickname"
                    type="text"
                    required
                    className="h-12 uppercase"
                    placeholder="e.g., YOGINNAIDU"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Used in bank payment templates (no spaces)
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      name="isAxisBank"
                      type="checkbox"
                      checked={isAxisBank}
                      onChange={(e) => setIsAxisBank(e.target.checked)}
                      className="w-5 h-5 border border-border accent-primary"
                    />
                    <span className="text-sm text-foreground">
                      This is an Axis Bank account
                    </span>
                  </label>
                  <p className="mt-1 ml-8 text-xs text-muted-foreground">
                    Auto-detected from IFSC code (UTIB prefix). Override if needed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compensation */}
          <Card className="mb-6 gap-0 rounded-none py-0 shadow-none">
            <CardHeader className="border-b px-6 py-4">
              <CardTitle className="text-sm">
                Compensation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs tracking-wider uppercase text-muted-foreground mb-2">
                    Bi-weekly Salary (₹) *
                  </Label>
                  <Input
                    name="grossSalary"
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    className="h-12"
                    placeholder="e.g., 37500"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Amount paid every 14 days
                  </p>
                </div>

                <div>
                  <Label className="text-xs tracking-wider uppercase text-muted-foreground mb-2">
                    TDS Rate (%)
                  </Label>
                  <Input
                    name="tdsRate"
                    type="number"
                    defaultValue="10"
                    min="0"
                    max="100"
                    step="0.01"
                    className="h-12"
                  />
                </div>

                <div>
                  <Label className="text-xs tracking-wider uppercase text-muted-foreground mb-2">
                    Leave Balance (Days)
                  </Label>
                  <Input
                    name="leaveBalance"
                    type="number"
                    defaultValue="0"
                    min="0"
                    step="0.5"
                    className="h-12"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Carried over from previous year
                  </p>
                </div>

                <div>
                  <Label className="text-xs tracking-wider uppercase text-muted-foreground mb-2">
                    Salary Debt Balance (₹)
                  </Label>
                  <Input
                    name="salaryDebtBalance"
                    type="number"
                    defaultValue="0"
                    min="0"
                    step="0.01"
                    className="h-12"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pending salary from proprietorship transition
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={isSubmitting}>
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save Lokwasi'}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/lokwasis">Cancel</Link>
            </Button>
          </div>
        </form>
      </main>
    </>
  )
}
