import { NextRequest, NextResponse } from 'next/server'
import { generatePendingPayrolls } from '@/lib/payroll/generate'

/**
 * GET /api/cron/generate-payroll
 * Automatically generates pending payroll runs for any overdue pay periods.
 * Protected by CRON_SECRET environment variable (used by Vercel Cron).
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await generatePendingPayrolls(undefined, 'cron')

    return NextResponse.json({
      message: result.message,
      generated: result.generated,
      payrollRuns: result.payrollRuns,
    })
  } catch (error) {
    console.error('Cron: Error generating payrolls:', error)
    return NextResponse.json(
      { error: 'Failed to generate payrolls' },
      { status: 500 }
    )
  }
}
