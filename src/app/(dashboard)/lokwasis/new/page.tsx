'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { ArrowLeft, Save } from 'lucide-react'

export default function NewLokwasiPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

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
      ifscCode: (formData.get('ifscCode') as string).toUpperCase(),
      bankName: formData.get('bankName') as string,
      beneficiaryNickname: formData.get('beneficiaryNickname') as string,
      isAxisBank: formData.get('isAxisBank') === 'true',
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
          className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Lokwasis
        </Link>

        <form onSubmit={handleSubmit} className="max-w-3xl">
          {errors.general && (
            <div className="mb-6 p-4 bg-[var(--error-light)] border border-[var(--error)] text-[var(--error)]">
              {errors.general}
            </div>
          )}

          {/* Personal Information */}
          <div className="bg-white border border-[var(--border)] mb-6">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Personal Information
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                  Full Name *
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                  placeholder="e.g., Yogin Naidu"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-[var(--error)]">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                  PAN Number *
                </label>
                <input
                  name="pan"
                  type="text"
                  required
                  maxLength={10}
                  className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)] uppercase"
                  placeholder="AAAAA0000A"
                />
                {errors.pan && (
                  <p className="mt-1 text-sm text-[var(--error)]">{errors.pan}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                  Aadhaar Number *
                </label>
                <input
                  name="aadhaar"
                  type="text"
                  required
                  maxLength={14}
                  className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                  placeholder="0000 0000 0000"
                />
                {errors.aadhaar && (
                  <p className="mt-1 text-sm text-[var(--error)]">{errors.aadhaar}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                  Joined Date *
                </label>
                <input
                  name="joinedDate"
                  type="date"
                  required
                  className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                  Nature of Work
                </label>
                <input
                  name="natureOfWork"
                  type="text"
                  defaultValue="Professional Services"
                  className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="bg-white border border-[var(--border)] mb-6">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Bank Details
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                  Bank Name *
                </label>
                <input
                  name="bankName"
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                  placeholder="e.g., State Bank of India"
                />
              </div>

              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                  Account Number *
                </label>
                <input
                  name="bankAccount"
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                  placeholder="e.g., 30209006571"
                />
              </div>

              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                  IFSC Code *
                </label>
                <input
                  name="ifscCode"
                  type="text"
                  required
                  maxLength={11}
                  className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)] uppercase"
                  placeholder="e.g., SBIN0009019"
                />
                {errors.ifscCode && (
                  <p className="mt-1 text-sm text-[var(--error)]">{errors.ifscCode}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                  Beneficiary Nickname *
                </label>
                <input
                  name="beneficiaryNickname"
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)] uppercase"
                  placeholder="e.g., YOGINNAIDU"
                />
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Used in bank payment templates (no spaces)
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    name="isAxisBank"
                    type="checkbox"
                    value="true"
                    className="w-5 h-5 border border-[var(--border)] accent-[var(--primary)]"
                  />
                  <span className="text-sm text-[var(--foreground)]">
                    This is an Axis Bank account
                  </span>
                </label>
                <p className="mt-1 ml-8 text-xs text-[var(--muted-foreground)]">
                  Check if the bank account is with Axis Bank (for within-bank transfers)
                </p>
              </div>
            </div>
          </div>

          {/* Compensation */}
          <div className="bg-white border border-[var(--border)] mb-6">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Compensation
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                  Bi-weekly Salary (₹) *
                </label>
                <input
                  name="grossSalary"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                  placeholder="e.g., 37500"
                />
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Amount paid every 14 days
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                  TDS Rate (%)
                </label>
                <input
                  name="tdsRate"
                  type="number"
                  defaultValue="10"
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
                  defaultValue="0"
                  min="0"
                  step="0.5"
                  className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                />
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Carried over from previous year
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                  Salary Debt Balance (₹)
                </label>
                <input
                  name="salaryDebtBalance"
                  type="number"
                  defaultValue="0"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                />
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Pending salary from proprietorship transition
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white font-medium hover:bg-[var(--devalok-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save Lokwasi'}
            </button>
            <Link
              href="/lokwasis"
              className="px-6 py-3 border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--muted)] transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </>
  )
}
