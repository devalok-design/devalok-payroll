'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import {
  ArrowLeft,
  CheckCircle,
  Download,
  FileText,
  Loader2,
} from 'lucide-react'

interface TdsRecord {
  id: string
  lokwasi: {
    id: string
    name: string
    employeeCode: string
    pan: string
    aadhaar: string
    natureOfWork: string
  }
  totalGross: number
  totalTds: number
  totalNet: number
  paymentCount: number
  filingStatus: string
  challanNumber: string | null
  filedDate: string | null
  paidDate: string | null
}

interface MonthlyTdsData {
  year: number
  month: number
  records: TdsRecord[]
  totals: {
    totalGross: number
    totalTds: number
    totalNet: number
    employeeCount: number
  }
}

export default function TdsMonthDetailPage({
  params,
}: {
  params: { year: string; month: string }
}) {
  const { year, month } = params
  const router = useRouter()
  const [data, setData] = useState<MonthlyTdsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const yearNum = parseInt(year)
  const monthNum = parseInt(month)

  useEffect(() => {
    fetchTdsData()
  }, [year, month])

  async function fetchTdsData(): Promise<void> {
    try {
      const response = await fetch(`/api/tds/${year}/${month}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/tds')
          return
        }
        throw new Error('Failed to fetch TDS data')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching TDS data:', err)
      toast.error('Failed to load TDS data')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDownload(): Promise<void> {
    setIsDownloading(true)
    try {
      const response = await fetch(`/api/tds/${year}/${month}/download`)
      if (!response.ok) throw new Error('Failed to download')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `devalok-tds-${year}-${month.toString().padStart(2, '0')}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
      toast.success('TDS report downloaded')
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Failed to download TDS report')
    } finally {
      setIsDownloading(false)
    }
  }

  async function updateAllStatus(status: string): Promise<void> {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/tds/${year}/${month}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error('Failed to update status')
      await fetchTdsData()
      toast.success('Status updated successfully')
    } catch (err) {
      console.error('Update error:', err)
      toast.error('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const monthName = new Date(yearNum, monthNum - 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })

  if (isLoading) {
    return (
      <>
        <Header title="Loading..." />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </>
    )
  }

  if (!data) {
    return (
      <>
        <Header title="Not Found" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No TDS data for this month</p>
            <Link href="/tds" className="text-primary hover:underline">
              Back to TDS
            </Link>
          </div>
        </main>
      </>
    )
  }

  const hasPending = data.records.some((r) => r.filingStatus === 'PENDING')
  const hasWaiting = data.records.some((r) => r.filingStatus === 'WAITING_FOR_FILING')
  const hasFiled = data.records.some((r) => r.filingStatus === 'FILED')
  const allPaid = data.records.every((r) => r.filingStatus === 'PAID')

  return (
    <>
      <Header title={`TDS - ${monthName}`} />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Back link */}
        <Link
          href="/tds"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to TDS
        </Link>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="rounded-none shadow-none py-0 gap-0">
            <CardContent className="p-4">
              <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                Employees
              </p>
              <p className="text-2xl font-semibold text-foreground">
                {data.totals.employeeCount}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-none shadow-none py-0 gap-0">
            <CardContent className="p-4">
              <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                Total Gross
              </p>
              <p className="text-2xl font-semibold text-foreground">
                {formatCurrency(data.totals.totalGross)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-none shadow-none py-0 gap-0">
            <CardContent className="p-4">
              <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                TDS Deducted
              </p>
              <p className="text-2xl font-semibold text-primary">
                {formatCurrency(data.totals.totalTds)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-none shadow-none py-0 gap-0">
            <CardContent className="p-4">
              <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-1">
                Net Paid
              </p>
              <p className="text-2xl font-semibold text-foreground">
                {formatCurrency(data.totals.totalNet)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="bg-devalok-50 border border-devalok-200 p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-foreground">TDS Report for CA</h3>
              <p className="text-sm text-muted-foreground">
                Download the report and share with your CA for filing
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download Excel
              </Button>

              {hasPending && (
                <Button
                  onClick={() => updateAllStatus('WAITING_FOR_FILING')}
                  disabled={isUpdating}
                  className="bg-info text-white hover:bg-info/90"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  Mark Sent to CA
                </Button>
              )}

              {hasWaiting && (
                <Button
                  onClick={() => updateAllStatus('FILED')}
                  disabled={isUpdating}
                  className="bg-devalok-700 text-white hover:bg-devalok-800"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Mark Filed
                </Button>
              )}

              {hasFiled && !allPaid && (
                <Button
                  onClick={() => updateAllStatus('PAID')}
                  disabled={isUpdating}
                  className="bg-success text-white hover:bg-success/80"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Mark Paid
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Details Table */}
        <Card className="rounded-none shadow-none py-0 gap-0 overflow-hidden">
          <CardHeader className="px-6 py-4 border-b">
            <CardTitle className="text-sm">
              Employee-wise TDS Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    Employee
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    PAN
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    Nature of Work
                  </TableHead>
                  <TableHead className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    Payments
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    Gross
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    TDS
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    Net
                  </TableHead>
                  <TableHead className="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="px-4 py-4">
                      <Link
                        href={`/lokwasis/${record.lokwasi.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {record.lokwasi.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {record.lokwasi.employeeCode}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm font-mono text-foreground">
                      {record.lokwasi.pan}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm text-muted-foreground">
                      {record.lokwasi.natureOfWork}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-center text-sm text-foreground">
                      {record.paymentCount}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right text-sm text-foreground">
                      {formatCurrency(record.totalGross)}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right font-medium text-primary">
                      {formatCurrency(record.totalTds)}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right text-sm text-foreground">
                      {formatCurrency(record.totalNet)}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-center">
                      <StatusBadge status={record.filingStatus} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="bg-muted font-semibold">
                <TableRow>
                  <TableCell colSpan={4} className="px-4 py-3 text-right text-sm text-foreground">
                    TOTAL
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right text-sm text-foreground">
                    {formatCurrency(data.totals.totalGross)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right text-primary">
                    {formatCurrency(data.totals.totalTds)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right text-sm text-foreground">
                    {formatCurrency(data.totals.totalNet)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  )
}
