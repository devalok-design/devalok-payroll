import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PortalHeader } from '@/components/portal/PortalHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Wallet } from 'lucide-react'

const categoryLabels: Record<string, string> = {
  REGULAR_SALARY: 'Regular Salary',
  ADVANCE_SALARY: 'Advance Salary',
  BONUS: 'Bonus',
  REIMBURSEMENT: 'Reimbursement',
  LOAN_DISBURSEMENT: 'Loan Disbursement',
  SALARY_DEBT: 'Salary Debt',
  LEAVE_CASHOUT: 'Leave Cashout',
  ADVANCE_RECOVERY: 'Advance Recovery',
  LOAN_RECOVERY: 'Loan Recovery',
  ADJUSTMENT: 'Adjustment',
}

export default async function PortalAccountPage() {
  const session = await auth()
  if (!session?.user?.lokwasiId) redirect('/login')

  const lokwasi = await prisma.lokwasi.findUnique({
    where: { id: session.user.lokwasiId },
    select: { accountBalance: true, leaveBalance: true },
  })

  const transactions = await prisma.accountTransaction.findMany({
    where: { lokwasiId: session.user.lokwasiId },
    orderBy: { transactionDate: 'desc' },
    take: 100,
  })

  if (!lokwasi) redirect('/login')

  const balance = Number(lokwasi.accountBalance)
  const leaveBalance = Number(lokwasi.leaveBalance)

  return (
    <>
      <PortalHeader title="Account" />
      <main className="flex-1 overflow-y-auto p-6">
        {/* Balance cards */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Account Balance
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(Math.abs(balance))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {balance > 0
                  ? 'Company owes you'
                  : balance < 0
                    ? 'You owe the company'
                    : 'Settled'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Leave Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {leaveBalance} <span className="text-sm font-normal text-muted-foreground">days</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction history */}
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Transaction History</h3>
            </div>
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Wallet className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">No transactions yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs uppercase tracking-wider">Date</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Type</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Category</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-right">Amount</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDate(tx.transactionDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={
                          tx.type === 'CREDIT'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }>
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {categoryLabels[tx.category] || tx.category}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}>
                          {tx.type === 'CREDIT' ? '+' : '−'} {formatCurrency(Number(tx.amount))}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(Number(tx.balanceAfter))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  )
}
