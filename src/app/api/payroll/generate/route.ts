import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/rbac'
import { generatePendingPayrolls } from '@/lib/payroll/generate'

/**
 * POST /api/payroll/generate
 * Generates pending payroll runs for any overdue pay periods
 * Based on the payroll schedule and current date
 */
export async function POST() {
  const session = await auth()
  const rbacError = requireAdmin(session)
  if (rbacError) return rbacError

  try {
    const result = await generatePendingPayrolls(session!.user.id, 'manual')

    if (result.generated === 0) {
      return NextResponse.json({
        message: result.message,
        generated: 0,
      })
    }

    return NextResponse.json({
      message: result.message,
      generated: result.generated,
      payrollRuns: result.payrollRuns,
    })
  } catch (error) {
    console.error('Error generating payrolls:', error)
    return NextResponse.json(
      { error: 'Failed to generate payrolls' },
      { status: 500 }
    )
  }
}
