import { PrismaClient } from '@prisma/client'
import { compare } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'mudit@devalok.in' }
  })

  console.log('User found:', user ? 'Yes' : 'No')

  if (user) {
    console.log('Email:', user.email)
    console.log('Name:', user.name)
    console.log('Password hash exists:', !!user.passwordHash)

    // Test password
    if (!user.passwordHash) {
      console.log('No password hash (OAuth user)')
      await prisma.$disconnect()
      return
    }
    const isValid = await compare('admin123', user.passwordHash)
    console.log('Password "admin123" valid:', isValid)
  }

  await prisma.$disconnect()
}

main().catch(console.error)
