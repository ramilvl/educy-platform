import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { RoleName } from '@prisma/client'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.hashedPassword) {
          // Log failed login attempt for non-existent user
          await prisma.auditLog.create({
            data: {
              action: 'LOGIN_FAILED',
              targetType: 'User',
              details: {
                email: credentials.email,
                reason: 'User not found or no password set',
                timestamp: new Date().toISOString(),
              },
              severity: 'WARNING',
              category: 'SECURITY',
            },
          })
          throw new Error('Invalid credentials')
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        )

        if (!isPasswordValid) {
          // Log failed login attempt with user context
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: 'LOGIN_FAILED',
              targetType: 'User',
              targetId: user.id,
              details: {
                email: user.email,
                reason: 'Invalid password',
                timestamp: new Date().toISOString(),
              },
              severity: 'WARNING',
              category: 'SECURITY',
            },
          })
          throw new Error('Invalid credentials')
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        })

        // Log authentication
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'USER_LOGIN',
            targetType: 'User',
            targetId: user.id,
            details: { email: user.email, timestamp: new Date().toISOString() },
          },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          surname: user.surname,
          role: user.role,
          image: user.profileAvatarUrl,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign in
      if (user) {
        token.role = user.role
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.surname = user.surname
        token.image = user.image
        token.iat = Math.floor(Date.now() / 1000) // Set issued at time
      }

      // Refresh token data on update (role changes, profile updates)
      if (trigger === 'update' && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, name: true, surname: true, email: true, profileAvatarUrl: true },
        })
        if (dbUser) {
          // Check if role changed - if so, rotate token
          if (token.role !== dbUser.role) {
            token.iat = Math.floor(Date.now() / 1000) // Rotate token on role change
            console.warn(`Token rotated for user ${token.id} due to role change`)
          }
          token.role = dbUser.role
          token.name = dbUser.name
          token.surname = dbUser.surname
          token.email = dbUser.email
          token.image = dbUser.profileAvatarUrl
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.role = token.role as RoleName
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.surname = token.surname as string | null
        session.user.image = token.image as string | null
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours (improved from 30 days for security)
    updateAge: 60 * 60, // 1 hour - session will be updated if older than this
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours - must match session maxAge
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Host-' : ''}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}

// Type augmentation for NextAuth
declare module 'next-auth' {
  interface User {
    role: RoleName
    surname?: string | null
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      surname?: string | null
      role: RoleName
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: RoleName
    id: string
    surname?: string | null
  }
}
