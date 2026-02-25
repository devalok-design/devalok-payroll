import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { prisma } from '@/lib/prisma'
import { formatCurrency, maskPan, formatDate } from '@/lib/utils'
import { Plus, Search, Users, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Badge } from '@/components/ui/badge'

async function getLokwasis() {
  return prisma.lokwasi.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      employeeCode: true,
      name: true,
      pan: true,
      aadhaar: true,
      bankName: true,
      grossSalary: true,
      tdsRate: true,
      leaveBalance: true,
      salaryDebtBalance: true,
      status: true,
      isAxisBank: true,
      terminatedDate: true,
    },
  })
}

export default async function LokwasisPage() {
  const lokwasis = await getLokwasis()
  const activeLokwasis = lokwasis.filter((l) => l.status === 'ACTIVE')
  const terminatedLokwasis = lokwasis.filter((l) => l.status === 'TERMINATED')
  const inactiveLokwasis = lokwasis.filter((l) => l.status === 'INACTIVE')

  return (
    <>
      <Header title="Lokwasis" />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Header with actions */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">
              {activeLokwasis.length} active team members
              {terminatedLokwasis.length > 0 && (
                <span className="ml-2 text-error">
                  • {terminatedLokwasis.length} terminated
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search lokwasis..."
                className="pl-10"
              />
            </div>
            <Button asChild>
              <Link href="/lokwasis/new">
                <Plus className="w-4 h-4" />
                Add Lokwasi
              </Link>
            </Button>
          </div>
        </div>

        {/* Active Lokwasis Table */}
        <Card className="gap-0 py-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Name
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  PAN
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Bank
                </TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Salary
                </TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  TDS %
                </TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Leave Balance
                </TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Debt
                </TableHead>
                <TableHead className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeLokwasis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="px-4 py-12 text-center">
                    <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No active lokwasis found</p>
                    <Link
                      href="/lokwasis/new"
                      className="mt-4 inline-block text-primary hover:underline"
                    >
                      Add your first lokwasi
                    </Link>
                  </TableCell>
                </TableRow>
              ) : (
                activeLokwasis.map((lokwasi) => (
                  <TableRow key={lokwasi.id}>
                    <TableCell className="px-4 py-4">
                      <Link
                        href={`/lokwasis/${lokwasi.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {lokwasi.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {lokwasi.employeeCode}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm text-muted-foreground">
                      {maskPan(lokwasi.pan)}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <span className="text-sm text-foreground">
                        {lokwasi.bankName || '-'}
                      </span>
                      {lokwasi.isAxisBank && (
                        <Badge variant="info" className="ml-2">AXIS</Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right font-medium text-foreground">
                      {formatCurrency(Number(lokwasi.grossSalary))}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right text-sm text-foreground">
                      {Number(lokwasi.tdsRate)}%
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right text-sm text-foreground">
                      {Number(lokwasi.leaveBalance)} days
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right">
                      {Number(lokwasi.salaryDebtBalance) > 0 ? (
                        <span className="font-medium text-warning">
                          {formatCurrency(Number(lokwasi.salaryDebtBalance))}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-center">
                      <StatusBadge status="ACTIVE" showIcon={false} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Summary */}
        {activeLokwasis.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="gap-2 p-4">
              <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                Total Monthly Salary
              </p>
              <p className="text-xl font-semibold text-foreground">
                {formatCurrency(
                  activeLokwasis.reduce((sum, l) => sum + Number(l.grossSalary) * 2, 0)
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                (2 pay cycles)
              </p>
            </Card>
            <Card className="gap-2 p-4">
              <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                Total Leave Balance
              </p>
              <p className="text-xl font-semibold text-foreground">
                {activeLokwasis.reduce((sum, l) => sum + Number(l.leaveBalance), 0)} days
              </p>
            </Card>
            <Card className="gap-2 p-4">
              <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                Total Pending Debt
              </p>
              <p className="text-xl font-semibold text-warning">
                {formatCurrency(
                  activeLokwasis.reduce((sum, l) => sum + Number(l.salaryDebtBalance), 0)
                )}
              </p>
            </Card>
          </div>
        )}

        {/* Terminated Lokwasis Section */}
        {terminatedLokwasis.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <UserX className="w-5 h-5 text-error" />
              <h2 className="text-lg font-semibold text-foreground">
                Terminated Lokwasis
              </h2>
              <span className="text-sm text-muted-foreground">
                ({terminatedLokwasis.length})
              </span>
            </div>
            <Card className="gap-0 py-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                      Name
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                      PAN
                    </TableHead>
                    <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                      Last Salary
                    </TableHead>
                    <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                      Outstanding Debt
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                      Terminated Date
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terminatedLokwasis.map((lokwasi) => (
                    <TableRow
                      key={lokwasi.id}
                      className="opacity-75"
                    >
                      <TableCell className="px-4 py-4">
                        <Link
                          href={`/lokwasis/${lokwasi.id}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {lokwasi.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {lokwasi.employeeCode}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-sm text-muted-foreground">
                        {maskPan(lokwasi.pan)}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right text-sm text-muted-foreground">
                        {formatCurrency(Number(lokwasi.grossSalary))}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right">
                        {Number(lokwasi.salaryDebtBalance) > 0 ? (
                          <span className="font-medium text-warning">
                            {formatCurrency(Number(lokwasi.salaryDebtBalance))}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-sm text-error">
                        {lokwasi.terminatedDate
                          ? formatDate(lokwasi.terminatedDate)
                          : 'Unknown'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* Terminated summary */}
            <div className="mt-4 p-4 bg-error-light border border-error/20">
              <p className="text-sm text-error">
                <strong>Outstanding debt from terminated lokwasis:</strong>{' '}
                {formatCurrency(
                  terminatedLokwasis.reduce((sum, l) => sum + Number(l.salaryDebtBalance), 0)
                )}
              </p>
            </div>
          </div>
        )}

        {/* Inactive Lokwasis Section (if any) */}
        {inactiveLokwasis.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Inactive Lokwasis ({inactiveLokwasis.length})
            </h2>
            <Card className="gap-0 py-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                      Name
                    </TableHead>
                    <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                      Last Salary
                    </TableHead>
                    <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                      Outstanding Debt
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inactiveLokwasis.map((lokwasi) => (
                    <TableRow
                      key={lokwasi.id}
                      className="opacity-60"
                    >
                      <TableCell className="px-4 py-4">
                        <Link
                          href={`/lokwasis/${lokwasi.id}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {lokwasi.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {lokwasi.employeeCode}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right text-sm text-muted-foreground">
                        {formatCurrency(Number(lokwasi.grossSalary))}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right">
                        {Number(lokwasi.salaryDebtBalance) > 0 ? (
                          <span className="font-medium text-warning">
                            {formatCurrency(Number(lokwasi.salaryDebtBalance))}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}
      </main>
    </>
  )
}
