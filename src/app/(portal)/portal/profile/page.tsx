import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  formatCurrency,
  formatDate,
  maskPan,
  maskAadhaar,
  maskBankAccount,
} from '@/lib/utils'
import { PortalHeader } from '@/components/portal/PortalHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-yellow-100 text-yellow-800',
  TERMINATED: 'bg-red-100 text-red-800',
}

export default async function PortalProfilePage() {
  const session = await auth()
  if (!session?.user?.lokwasiId) redirect('/login')

  const lokwasi = await prisma.lokwasi.findUnique({
    where: { id: session.user.lokwasiId },
  })

  if (!lokwasi) redirect('/login')

  return (
    <>
      <PortalHeader title="Profile" />
      <main className="flex-1 overflow-y-auto p-6">
        <Card className="max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{lokwasi.name}</CardTitle>
              <Badge
                variant="secondary"
                className={statusColors[lokwasi.status] || ''}
              >
                {lokwasi.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Employee Code: {lokwasi.employeeCode}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Employment details */}
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Employment
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Joined Date" value={formatDate(lokwasi.joinedDate)} />
                <Field label="Nature of Work" value={lokwasi.natureOfWork} />
                <Field
                  label="Gross Salary (per cycle)"
                  value={formatCurrency(Number(lokwasi.grossSalary))}
                />
                <Field label="TDS Rate" value={`${Number(lokwasi.tdsRate)}%`} />
              </div>
            </div>

            <Separator />

            {/* Sensitive details (masked) */}
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Tax & Bank Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="PAN" value={maskPan(lokwasi.pan)} />
                <Field label="Aadhaar" value={maskAadhaar(lokwasi.aadhaar)} />
                <Field label="Bank Account" value={maskBankAccount(lokwasi.bankAccount)} />
                <Field label="Bank Name" value={lokwasi.bankName} />
                <Field label="IFSC Code" value={lokwasi.ifscCode} />
              </div>
            </div>

            <Separator />

            {/* Balances */}
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Current Balances
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Account Balance"
                  value={formatCurrency(Math.abs(Number(lokwasi.accountBalance)))}
                  subtitle={
                    Number(lokwasi.accountBalance) > 0
                      ? 'Company owes you'
                      : Number(lokwasi.accountBalance) < 0
                        ? 'You owe the company'
                        : 'Settled'
                  }
                />
                <Field
                  label="Leave Balance"
                  value={`${Number(lokwasi.leaveBalance)} days`}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  )
}

function Field({
  label,
  value,
  subtitle,
}: {
  label: string
  value: string
  subtitle?: string
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  )
}
