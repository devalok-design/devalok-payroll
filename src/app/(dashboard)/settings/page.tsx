'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/Header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
      toast.success('Schedule saved successfully')
    } catch (err) {
      toast.error('Failed to save schedule')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <Header title="Settings" />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </>
    )
  }

  return (
    <>
      <Header title="Settings" />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl space-y-6">
          {/* Company Info */}
          <Card className="rounded-none py-0 gap-0">
            <CardHeader className="flex-row items-center gap-2 border-b py-4 px-6">
              <Building className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">
                Company Information
              </h2>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-3">
                  <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                    Company Name
                  </p>
                  <p className="text-foreground font-medium">
                    Devalok Design and Strategy Studio Private Limited
                  </p>
                </div>
                <div className="md:col-span-3">
                  <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                    Registered Address
                  </p>
                  <p className="text-foreground">
                    FF-91, Khajana Complex, Sector - K, Aashiyana<br />
                    Lucknow 226012, Uttar Pradesh, India
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                    PAN Number
                  </p>
                  <p className="text-foreground font-mono">
                    AALCD5985D
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                    TAN Number
                  </p>
                  <p className="text-foreground font-mono">
                    LKND11553D
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Account */}
          <Card className="rounded-none py-0 gap-0">
            <CardHeader className="flex-row items-center gap-2 border-b py-4 px-6">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">
                Debit Account
              </h2>
            </CardHeader>
            <CardContent className="p-6">
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted-foreground mb-2">
                  Axis Bank Debit Account Number
                </label>
                <Input
                  type="text"
                  value={debitAccount}
                  onChange={(e) => setDebitAccount(e.target.value)}
                  className="h-12 max-w-md font-mono"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  This account will be used as the debit account for all payroll payments
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payroll Schedule */}
          <form onSubmit={handleSaveSchedule}>
            <Card className="rounded-none py-0 gap-0">
              <CardHeader className="flex-row items-center gap-2 border-b py-4 px-6">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  Payroll Schedule
                </h2>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium tracking-wider uppercase text-muted-foreground mb-2">
                      Last Payroll Date
                    </label>
                    <Input
                      name="lastPayrollDate"
                      type="date"
                      defaultValue={
                        schedule?.lastPayrollDate
                          ? new Date(schedule.lastPayrollDate).toISOString().split('T')[0]
                          : ''
                      }
                      className="h-12"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      The date when payroll was last processed
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium tracking-wider uppercase text-muted-foreground mb-2">
                      Next Payroll Date
                    </label>
                    <Input
                      type="date"
                      value={
                        schedule?.nextPayrollDate
                          ? new Date(schedule.nextPayrollDate).toISOString().split('T')[0]
                          : ''
                      }
                      disabled
                      className="h-12 bg-muted text-muted-foreground"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Calculated automatically based on cycle days
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium tracking-wider uppercase text-muted-foreground mb-2">
                      Pay Cycle (Days)
                    </label>
                    <select
                      name="cycleDays"
                      defaultValue={schedule?.cycleDays || 14}
                      className="h-12 w-full border border-input bg-background px-4 text-sm focus:outline-none focus:border-ring"
                    >
                      <option value="7">Weekly (7 days)</option>
                      <option value="14">Bi-weekly (14 days)</option>
                      <option value="15">Semi-monthly (15 days)</option>
                      <option value="30">Monthly (30 days)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium tracking-wider uppercase text-muted-foreground mb-2">
                      Auto-Generation Time (IST)
                    </label>
                    <Input
                      name="generationTime"
                      type="time"
                      defaultValue={schedule?.generationTime || '09:00'}
                      className="h-12"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Time when payroll will be auto-generated on due dates
                    </p>
                  </div>
                </div>
                <div>
                  <Button type="submit" disabled={isSaving} size="lg">
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

          {/* Users */}
          <Card className="rounded-none py-0 gap-0">
            <CardHeader className="flex-row items-center justify-between border-b py-4 px-6">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  Users
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {users.length} user(s)
              </span>
            </CardHeader>
            <div className="divide-y divide-border">
              {users.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  No users found
                </div>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="px-6 py-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-foreground">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                      {user.lastLoginAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last login:{' '}
                          {new Date(user.lastLoginAt).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Security Note */}
          <Card className="rounded-none py-0 gap-0 bg-muted">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-medium text-foreground">Security Note</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sensitive data (PAN, Aadhaar, Bank Account numbers) is encrypted at rest.
                    All actions are logged in the audit trail for compliance purposes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}
