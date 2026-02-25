/**
 * Verify Password Script
 * Tests if a password matches the stored hash
 */

import { PrismaClient } from '@prisma/client'
import { compare, hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2] || 'mudit@devalok.in'
  const testPassword = process.argv[3] || 'Devalok2026!'

  console.log(`\nVerifying password for: ${email}`)
  console.log(`Testing password: ${testPassword}`)

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      lastLoginAt: true,
    },
  })

  if (!user) {
    console.error(`\n❌ User not found: ${email}`)
    process.exit(1)
  }

  console.log(`\nUser found:`)
  console.log(`  Name: ${user.name}`)
  console.log(`  Email: ${user.email}`)
  console.log(`  Last login: ${user.lastLoginAt || 'Never'}`)
  if (!user.passwordHash) {
    console.log(`  No password hash (OAuth user)`)
    process.exit(0)
  }
  console.log(`  Hash length: ${user.passwordHash.length}`)
  console.log(`  Hash preview: ${user.passwordHash.substring(0, 30)}...`)

  // Test password comparison
  console.log(`\nTesting password comparison...`)
  const isValid = await compare(testPassword, user.passwordHash)
  console.log(`  Password valid: ${isValid ? '✓ YES' : '❌ NO'}`)

  // Generate a new hash for comparison
  console.log(`\nGenerating fresh hash for comparison...`)
  const freshHash = await hash(testPassword, 12)
  console.log(`  Fresh hash: ${freshHash.substring(0, 30)}...`)

  const freshValid = await compare(testPassword, freshHash)
  console.log(`  Fresh hash valid: ${freshValid ? '✓ YES' : '❌ NO'}`)

  if (!isValid) {
    console.log(`\n⚠️  Password does not match! Updating password...`)
    const newHash = await hash(testPassword, 12)
    await prisma.user.update({
      where: { email },
      data: { passwordHash: newHash },
    })
    console.log(`✓ Password updated successfully`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
