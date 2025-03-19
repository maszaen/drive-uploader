// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions } from 'next-auth'
import type { Session } from 'next-auth'

interface ExtendedUser {
  id: string
  name?: string | null
  email?: string | null
  role?: string
}

interface ExtendedSession extends Session {
  user: ExtendedUser
}

const API_URL = 'https://drvsrv-891166606972.asia-southeast1.run.app'

const comparePasswords = (
  inputPassword: string,
  storedPassword: string
): boolean => {
  return inputPassword === storedPassword
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Password',
      credentials: {
        password: { label: 'Password', type: 'password' },
        fingerprint: { label: 'Fingerprint', type: 'text' },
      },
      async authorize(credentials, req) {
        if (!credentials?.password) {
          return null
        }

        const adminPassword = process.env.ADMIN_PASSWORD
        const adminPassword2 = process.env.ADMIN_PASSWORD2

        if (!adminPassword) {
          throw new Error('Admin password not configured')
        }

        const isValid =
          comparePasswords(credentials.password, adminPassword) ||
          (adminPassword2 &&
            comparePasswords(credentials.password, adminPassword2))

        if (isValid) {
          try {
            const ip =
              (req.headers?.['x-forwarded-for'] as string) ||
              (req.headers?.['x-real-ip'] as string) ||
              'unknown'

            const fingerprint = credentials.fingerprint || 'unknown'

            fetch(`${API_URL}/login-attempt`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                attempts: 0,
                fingerprint: fingerprint,
              }),
            }).catch((err) =>
              console.error('Failed to report successful login:', err)
            )
          } catch (error) {
            console.error('Error during login attempt:', error)
          }

          return {
            id: 'zaeniahmad',
            name: 'Zaeni Ahmad',
            email: 'exqeon@gmail.com',
            role: 'admin',
          } as ExtendedUser
        }

        try {
          const ip =
            (req.headers?.['x-forwarded-for'] as string) ||
            (req.headers?.['x-real-ip'] as string) ||
            'unknown'

          const fingerprint = credentials.fingerprint || 'unknown'

          fetch(`${API_URL}/login-attempt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              attempts: 1,
              fingerprint: fingerprint,
            }),
          }).catch((err) =>
            console.error('Failed to report login attempt:', err)
          )
        } catch (error) {
          console.error('Error during login attempt:', error)
        }

        return null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as ExtendedUser).role
        token.authTime = Date.now()
      }
      return token
    },
    async session({ session, token }): Promise<ExtendedSession> {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
        },
      }
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60,
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
