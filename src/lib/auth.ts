import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from './prisma'

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('[Auth] Authorize called with email:', credentials?.email)

        if (!credentials?.email || !credentials?.password) {
          console.log('[Auth] Missing credentials')
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email as string,
            },
          })

          console.log('[Auth] User found:', user ? user.email : 'NOT FOUND')

          if (!user) {
            console.log('[Auth] User not found in database')
            return null
          }

          const isPasswordValid = await compare(
            credentials.password as string,
            user.passwordHash
          )

          console.log('[Auth] Password valid:', isPasswordValid)

          if (!isPasswordValid) {
            console.log('[Auth] Invalid password')
            return null
          }

          // Update last login
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          })

          console.log('[Auth] Login successful for:', user.email)

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          console.error('[Auth] Error during authorization:', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true,
})

// Extend types for NextAuth v5
declare module 'next-auth' {
  interface User {
    role?: string
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
    }
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id?: string
    role?: string
  }
}
