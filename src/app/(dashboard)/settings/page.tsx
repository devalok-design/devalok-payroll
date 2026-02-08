'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { formatCurrency } from '@/lib/utils'
import {
  Building,
  Calendar,
  CreditCard,
  Loader2,
  Save,
  Shield,
  Users,
} from 'lucide-react'

interface PayrollSchedule {
  id: string
  lastPayrollDate: string
  nextPayrollDate: string
  cycleDays: number
  generationTime: string
  isActive: boolean
}

interface User {
  id: string
  name: string
  email: string
  role: string
  lastLoginAt: string | null
}

export default function SettingsPage() {
  const [schedule, setSchedule] = useState<PayrollSchedule | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [debitAccount, setDebitAccount] = useState('925020020822684')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSchedule(data.schedule)
        setUsers(data.users || [])
        if (data.debitAccount) {
          setDebitAccount(data.debitAccount)
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSchedule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    setError('')
    setSuccess('')

    const formData = new FormData(e.currentTarget)
    const data = {
      lastPayrollDate: formData.get('lastPayrollDate') as string,
      cycleDays: parseInt(formData.get('cycleDays') as string) || 14,
      generationTime: formData.get('generationTime') as string,
    }

    try {
      const response = await fetch('/api/settings/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to save schedule')
      }

      const result = await response.json()
      setSchedule(result.schedule)
      setSuccess('Schedule saved successfully')
    } catch (err) {
      setError('Failed to save schedule')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <Header title="Settings" />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        </main>
      </>
    )
  }

  return (
    <>
      <Header title="Settings" />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl space-y-6">
          {error && (
            <div className="p-4 bg-[var(--error-light)] border border-[var(--error)] text-[var(--error)]">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-[var(--success-light)] border border-[var(--success)] text-[var(--success)]">
              {success}
            </div>
          )}

          {/* Company Info */}
          <div className="bg-white border border-[var(--border)]">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
              <Building className="w-4 h-4 text-[var(--muted-foreground)]" />
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Company Information
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-3">
                  <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                    Company Name
                  </p>
                  <p className="text-[var(--foreground)] font-medium">
                    Devalok Design and Strategy Studio Private Limited
                  </p>
                </div>
                <div className="md:col-span-3">
                  <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                    Registered Address
                  </p>
                  <p className="text-[var(--foreground)]">
                    FF-91, Khajana Complex, Sector - K, Aashiyana<br />
                    Lucknow 226012, Uttar Pradesh, India
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                    PAN Number
                  </p>
                  <p className="text-[var(--foreground)] font-mono">
                    AALCD5985D
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-1">
                    TAN Number
                  </p>
                  <p className="text-[var(--foreground)] font-mono">
                    LKND11553D
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Account */}
          <div className="bg-white border border-[var(--border)]">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[var(--muted-foreground)]" />
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Debit Account
              </h2>
            </div>
            <div className="p-6">
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                  Axis Bank Debit Account Number
                </label>
                <input
                  type="text"
                  value={debitAccount}
                  onChange={(e) => setDebitAccount(e.target.value)}
                  className="w-full max-w-md px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)] font-mono"
                />
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  This account will be used as the debit account for all payroll payments
                </p>
              </div>
            </div>
          </div>

          {/* Payroll Schedule */}
          <form
            onSubmit={handleSaveSchedule}
            className="bg-white border border-[var(--border)]"
          >
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--muted-foreground)]" />
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Payroll Schedule
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                    Last Payroll Date
                  </label>
                  <input
                    name="lastPayrollDate"
                    type="date"
                    defaultValue={
                      schedule?.lastPayrollDate
                        ? new Date(schedule.lastPayrollDate).toISOString().split('T')[0]
                        : ''
                    }
                    className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                  />
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    The date when payroll was last processed
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                    Next Payroll Date
                  </label>
                  <input
                    type="date"
                    value={
                      schedule?.nextPayrollDate
                        ? new Date(schedule.nextPayrollDate).toISOString().split('T')[0]
                        : ''
                    }
                    disabled
                    className="w-full px-4 py-3 border border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]"
                  />
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Calculated automatically based on cycle days
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                    Pay Cycle (Days)
                  </label>
                  <select
                    name="cycleDays"
                    defaultValue={schedule?.cycleDays || 14}
                    className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                  >
                    <option value="7">Weekly (7 days)</option>
                    <option value="14">Bi-weekly (14 days)</option>
                    <option value="15">Semi-monthly (15 days)</option>
                    <option value="30">Monthly (30 days)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)] mb-2">
                    Auto-Generation Time (IST)
                  </label>
                  <input
                    name="generationTime"
                    type="time"
                    defaultValue={schedule?.generationTime || '09:00'}
                    className="w-full px-4 py-3 border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary)]"
                  />
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Time when payroll will be auto-generated on due dates
                  </p>
                </div>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white font-medium hover:bg-[var(--devalok-700)] disabled:opacity-50 transition-colors"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Schedule
                </button>
              </div>
            </div>
          </form>

          {/* Users */}
          <div className="bg-white border border-[var(--border)]">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--muted-foreground)]" />
                <h2 className="text-sm font-semibold text-[var(--foreground)]">
                  Users
                </h2>
              </div>
              <span className="text-xs text-[var(--muted-foreground)]">
                {users.length} user(s)
              </span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {users.length === 0 ? (
                <div className="p-6 text-center text-[var(--muted-foreground)]">
                  No users found
                </div>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="px-6 py-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{user.name}</p>
                      <p className="text-sm text-[var(--muted-foreground)]">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium ${
                          user.role === 'ADMIN'
                            ? 'bg-[var(--primary)] text-white'
                            : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                        }`}
                      >
                        {user.role}
                      </span>
                      {user.lastLoginAt && (
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                          Last login:{' '}
                          {new Date(user.lastLoginAt).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Security Note */}
          <div className="bg-[var(--muted)] border border-[var(--border)] p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-[var(--muted-foreground)] mt-0.5" />
              <div>
                <h3 className="font-medium text-[var(--foreground)]">Security Note</h3>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  Sensitive data (PAN, Aadhaar, Bank Account numbers) is encrypted at rest.
                  All actions are logged in the audit trail for compliance purposes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
