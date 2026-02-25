import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PortalHeader } from '@/components/portal/PortalHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft } from 'lucide-react'

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
}

export default async function PortalPayslipDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await auth()
  if (!session?.user?.lokwasiId) redirect('/login')

  const payment = await prisma.payment.findFirst({
    where: {
      id: params.id,
      lokwasiId: session.user.lokwasiId, // IDOR prevention
    },
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

  if (!payment) notFound()

  const gross = Number(payment.grossAmount)
  const tds = Number(payment.tdsAmount)
  const tdsRate = Number(payment.tdsRate)
  const leaveCashout = Number(payment.leaveCashoutAmount)
  const leaveDays = Number(payment.leaveCashoutDays)
  const debtPayout = Number(payment.debtPayoutAmount)
  const accountDebit = Number(payment.accountDebitAmount)
  const net = Number(payment.netAmount)

  return (
    <>
      <PortalHeader title="Payslip Detail" />
      <main className="flex-1 overflow-y-auto p-6">
        <Link
          href="/portal/payslips"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Payslips
        </Link>

        <Card className="max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {formatDate(payment.payrollRun.payPeriodStart)} –{' '}
                  {formatDate(payment.payrollRun.payPeriodEnd)}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Run Date: {formatDate(payment.payrollRun.runDate)}
                </p>
              </div>
              <Badge
                variant="secondary"
                className={statusColors[payment.paymentStatus] || ''}
              >
                {payment.paymentStatus}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Breakdown */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gross Salary</span>
                <span className="font-mono">{formatCurrency(gross)}</span>
              </div>

              {leaveCashout > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Leave Cashout ({leaveDays} days)
                  </span>
                  <span className="font-mono text-green-600">
                    + {formatCurrency(leaveCashout)}
                  </span>
                </div>
              )}

              {debtPayout > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Debt Payout</span>
                  <span className="font-mono text-green-600">
                    + {formatCurrency(debtPayout)}
                  </span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  TDS @ {tdsRate}%
                </span>
                <span className="font-mono text-red-600">
                  − {formatCurrency(tds)}
                </span>
              </div>

              {accountDebit > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Advance Recovery
                  </span>
                  <span className="font-mono text-red-600">
                    − {formatCurrency(accountDebit)}
                  </span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between text-base font-semibold">
                <span>Net Amount</span>
                <span className="text-primary font-mono">
                  {formatCurrency(net)}
                </span>
              </div>
            </div>

            {/* Footer info */}
            <div className="pt-4 border-t border-border space-y-2">
              {payment.paidAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid On</span>
                  <span>{formatDate(payment.paidAt)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono text-xs">{payment.customerReference}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  )
}
