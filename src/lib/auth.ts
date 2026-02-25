import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
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
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email as string,
          },
        })

        if (!user || !user.passwordHash) {
          return null
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          user.passwordHash
        )

        if (!isPasswordValid) {
          return null
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          hd: 'devalok.in',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Credentials sign-in: handled by authorize() above
      if (account?.provider === 'credentials') {
        return true
      }

      // Google OAuth sign-in
      if (account?.provider === 'google') {
        const email = user.email?.toLowerCase()
        if (!email) return false

        // 1. Check if email matches an ADMIN User record
        const adminUser = await prisma.user.findUnique({
          where: { email },
        })

        if (adminUser && adminUser.role === 'ADMIN') {
          // Persist OAuth Account linkage
          await upsertAccount(adminUser.id, account)
          await prisma.user.update({
            where: { id: adminUser.id },
            data: { lastLoginAt: new Date() },
          })
          return true
        }

        // 2. Check if email matches an active Lokwasi
        const lokwasi = await prisma.lokwasi.findUnique({
          where: { email },
        })

        if (!lokwasi || lokwasi.status !== 'ACTIVE') {
          return '/login?error=NoAccount'
        }

        // Find or create a User record for this Lokwasi
        let lokwasiUser = await prisma.user.findFirst({
          where: { lokwasiId: lokwasi.id },
        })

        if (!lokwasiUser) {
          lokwasiUser = await prisma.user.create({
            data: {
              email,
              name: lokwasi.name,
              role: 'LOKWASI',
              lokwasiId: lokwasi.id,
            },
          })
        }

        // Persist OAuth Account linkage
        await upsertAccount(lokwasiUser.id, account)
        await prisma.user.update({
          where: { id: lokwasiUser.id },
          data: { lastLoginAt: new Date() },
        })

        return true
      }

      return false
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Credentials sign-in: user object comes from authorize()
        token.id = user.id
        token.role = user.role
      }

      // Google OAuth: look up the actual User record
      if (account?.provider === 'google' && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
          select: { id: true, role: true, lokwasiId: true },
        })
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.lokwasiId = dbUser.lokwasiId ?? undefined
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        if (token.lokwasiId) {
          session.user.lokwasiId = token.lokwasiId as string
        }
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

/**
 * Upsert OAuth Account record for a user
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertAccount(userId: string, account: any) {
  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      },
    },
    update: {
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expires_at: account.expires_at,
      token_type: account.token_type,
      scope: account.scope,
      id_token: account.id_token,
    },
    create: {
      userId,
      type: account.type,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expires_at: account.expires_at,
      token_type: account.token_type,
      scope: account.scope,
      id_token: account.id_token,
    },
  })
}

// Extend types for NextAuth v5
declare module 'next-auth' {
  interface User {
    role?: string
    lokwasiId?: string
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      lokwasiId?: string
    }
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id?: string
    role?: string
    lokwasiId?: string
  }
}
