import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
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
  TableFooter,
} from '@/components/ui/table'
import { Receipt } from 'lucide-react'

const monthNames = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const filingStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  WAITING_FOR_FILING: 'bg-blue-100 text-blue-800',
  FILED: 'bg-purple-100 text-purple-800',
  PAID: 'bg-green-100 text-green-800',
}

export default async function PortalTdsPage() {
  const session = await auth()
  if (!session?.user?.lokwasiId) redirect('/login')

  const tdsRecords = await prisma.tdsMonthly.findMany({
    where: { lokwasiId: session.user.lokwasiId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })

  // Group by year
  const byYear = new Map<number, typeof tdsRecords>()
  for (const record of tdsRecords) {
    const existing = byYear.get(record.year) || []
    existing.push(record)
    byYear.set(record.year, existing)
  }

  const years = Array.from(byYear.keys()).sort((a, b) => b - a)

  return (
    <>
      <PortalHeader title="TDS" />
      <main className="flex-1 overflow-y-auto p-6">
        {tdsRecords.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Receipt className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No TDS records found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {years.map((year) => {
              const records = byYear.get(year)!
              const totalGross = records.reduce((s, r) => s + Number(r.totalGross), 0)
              const totalTds = records.reduce((s, r) => s + Number(r.totalTds), 0)
              const totalNet = records.reduce((s, r) => s + Number(r.totalNet), 0)

              return (
                <Card key={year}>
                  <CardContent className="p-0">
                    <div className="px-4 py-3 border-b border-border">
                      <h3 className="text-sm font-semibold">FY {year}</h3>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs uppercase tracking-wider">Month</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-right">Gross</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-right">TDS Deducted</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-right">Net</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider">Filing Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>{monthNames[record.month]}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(Number(record.totalGross))}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(Number(record.totalTds))}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(Number(record.totalNet))}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={filingStatusColors[record.filingStatus] || ''}
                              >
                                {record.filingStatus.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell className="font-semibold">Total</TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatCurrency(totalGross)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatCurrency(totalTds)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatCurrency(totalNet)}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
