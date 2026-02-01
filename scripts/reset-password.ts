/**
 * Password Reset Script
 *
 * Usage: npx tsx scripts/reset-password.ts <email> <new-password>
 * Example: npx tsx scripts/reset-password.ts mudit@devalok.in newpassword123
 */

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  const newPassword = process.argv[3]

  if (!email || !newPassword) {
    console.error('Usage: npx tsx scripts/reset-password.ts <email> <new-password>')
    console.error('Example: npx tsx scripts/reset-password.ts mudit@devalok.in newpassword123')
    process.exit(1)
  }

  if (newPassword.length < 6) {
    console.error('Password must be at least 6 characters')
    process.exit(1)
  }

  console.log(`Looking up user: ${email}...`)

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    console.error(`User not found: ${email}`)
    process.exit(1)
  }

  console.log(`Found user: ${user.name} (${user.email})`)
  console.log('Hashing new password...')

  const passwordHash = await hash(newPassword, 12)

  await prisma.user.update({
    where: { email },
    data: { passwordHash },
  })

  console.log(`\n✓ Password reset successfully for ${email}`)
  console.log(`\nYou can now log in with:`)
  console.log(`  Email: ${email}`)
  console.log(`  Password: ${newPassword}`)
}

main()
  .catch((error) => {
    console.error('Error:', error.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
