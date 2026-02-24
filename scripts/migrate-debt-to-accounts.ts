/**
 * Migration script: Copy salaryDebtBalance to accountBalance for all lokwasis.
 *
 * This script:
 * 1. Copies salaryDebtBalance -> accountBalance for all lokwasis
 * 2. Creates an initial AccountTransaction record for each lokwasi with debt
 *    (so there's an audit trail of where the balance came from)
 *
 * Safe to run multiple times - it checks if migration has already been done.
 *
 * Usage: npx tsx scripts/migrate-debt-to-accounts.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting debt -> account balance migration...\n')

  // Get all lokwasis with salary debt
  const lokwasis = await prisma.lokwasi.findMany({
    select: {
      id: true,
      name: true,
      employeeCode: true,
      salaryDebtBalance: true,
      accountBalance: true,
    },
  })

  let migrated = 0
  let skipped = 0

  for (const lokwasi of lokwasis) {
    const debtBalance = Number(lokwasi.salaryDebtBalance)
    const currentAccountBalance = Number(lokwasi.accountBalance)

    // Skip if already migrated (accountBalance is non-zero)
    if (currentAccountBalance !== 0) {
      console.log(`  SKIP ${lokwasi.employeeCode} ${lokwasi.name} - already has account balance: ${currentAccountBalance}`)
      skipped++
      continue
    }

    // Skip if no debt to migrate
    if (debtBalance === 0) {
      console.log(`  SKIP ${lokwasi.employeeCode} ${lokwasi.name} - no debt balance`)
      skipped++
      continue
    }

    // Migrate: set accountBalance = salaryDebtBalance (positive = company owes)
    await prisma.$transaction(async (tx) => {
      await tx.lokwasi.update({
        where: { id: lokwasi.id },
        data: { accountBalance: debtBalance },
      })

      // Create initial account transaction for audit trail
      await tx.accountTransaction.create({
        data: {
          lokwasiId: lokwasi.id,
          type: 'CREDIT',
          category: 'SALARY_DEBT',
          amount: debtBalance,
          balanceAfter: debtBalance,
          description: 'Migrated from salary debt balance (proprietorship transition)',
          transactionDate: new Date(),
          notes: 'Auto-migrated from salaryDebtBalance field',
        },
      })
    })

    console.log(`  OK   ${lokwasi.employeeCode} ${lokwasi.name} - migrated ₹${debtBalance.toLocaleString('en-IN')}`)
    migrated++
  }

  console.log(`\nMigration complete: ${migrated} migrated, ${skipped} skipped`)
}

main()
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
