import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PortalHeader } from '@/components/portal/PortalHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Banknote,
  Wallet,
  CalendarDays,
  TreePalm,
} from 'lucide-react'

async function getPortalData(lokwasiId: string) {
  const lokwasi = await prisma.lokwasi.findUnique({
    where: { id: lokwasiId },
    select: {
      name: true,
      accountBalance: true,
      leaveBalance: true,
    },
  })

  const latestPayment = await prisma.payment.findFirst({
    where: {
      lokwasiId,
      payrollRun: { status: { not: 'CANCELLED' } },
    },
    orderBy: { payrollRun: { runDate: 'desc' } },
    include: {
      payrollRun: {
        select: {
          runDate: true,
          payPeriodStart: true,
          payPeriodEnd: true,
          status: true,
        },
      },
    },
  })

  const schedule = await prisma.payrollSchedule.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    select: { nextPayrollDate: true },
  })

  return { lokwasi, latestPayment, schedule }
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  DRAFT: 'bg-blue-100 text-blue-800',
  PROCESSED: 'bg-purple-100 text-purple-800',
  PAID: 'bg-green-100 text-green-800',
}

export default async function PortalDashboard() {
  const session = await auth()
  if (!session?.user?.lokwasiId) redirect('/login')

  const { lokwasi, latestPayment, schedule } = await getPortalData(session.user.lokwasiId)
  if (!lokwasi) redirect('/login')

  const accountBalance = Number(lokwasi.accountBalance)
  const leaveBalance = Number(lokwasi.leaveBalance)

  return (
    <>
      <PortalHeader title="Overview" />
      <main className="flex-1 overflow-y-auto p-6">
        {/* Welcome */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-foreground">
            Hello, {lokwasi.name.split(' ')[0]}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Latest payslip */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Latest Payslip
              </CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {latestPayment ? (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(Number(latestPayment.netAmount))}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="secondary"
                      className={statusColors[latestPayment.paymentStatus] || ''}
                    >
                      {latestPayment.paymentStatus}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(latestPayment.payrollRun.payPeriodStart)} –{' '}
                      {formatDate(latestPayment.payrollRun.payPeriodEnd)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No payslips yet</p>
              )}
            </CardContent>
          </Card>

          {/* Account balance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Account Balance
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(Math.abs(accountBalance))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {accountBalance > 0
                  ? 'Company owes you'
                  : accountBalance < 0
                    ? 'You owe the company'
                    : 'Settled'}
              </p>
            </CardContent>
          </Card>

          {/* Leave balance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Leave Balance
              </CardTitle>
              <TreePalm className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {leaveBalance} <span className="text-sm font-normal text-muted-foreground">days</span>
              </div>
            </CardContent>
          </Card>

          {/* Next payroll */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Next Payroll
              </CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {schedule ? (
                <>
                  <div className="text-2xl font-bold">
                    {formatDate(schedule.nextPayrollDate)}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Not scheduled</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}
