import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PortalHeader } from '@/components/portal/PortalHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FileText } from 'lucide-react'

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
}

const runStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  DRAFT: 'bg-blue-100 text-blue-800',
  PROCESSED: 'bg-purple-100 text-purple-800',
  PAID: 'bg-green-100 text-green-800',
}

export default async function PortalPayslipsPage() {
  const session = await auth()
  if (!session?.user?.lokwasiId) redirect('/login')

  const payments = await prisma.payment.findMany({
    where: {
      lokwasiId: session.user.lokwasiId,
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

  return (
    <>
      <PortalHeader title="Payslips" />
      <main className="flex-1 overflow-y-auto p-6">
        {payments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No payslips found</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs uppercase tracking-wider">Pay Period</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-right">Gross</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-right">TDS</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-right">Net</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Payroll</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Payment</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Paid On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Link
                          href={`/portal/payslips/${payment.id}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {formatDate(payment.payrollRun.payPeriodStart)} –{' '}
                          {formatDate(payment.payrollRun.payPeriodEnd)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(Number(payment.grossAmount))}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(Number(payment.tdsAmount))}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(Number(payment.netAmount))}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={runStatusColors[payment.payrollRun.status] || ''}
                        >
                          {payment.payrollRun.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusColors[payment.paymentStatus] || ''}
                        >
                          {payment.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {payment.paidAt ? formatDate(payment.paidAt) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  )
}
