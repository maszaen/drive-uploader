import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import type { Session } from 'next-auth'

// Definisikan interface tambahan untuk User dan Session
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

// Fungsi sederhana untuk membandingkan password
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
      },
      async authorize(credentials, req) {
        if (!credentials?.password) {
          return null
        }

        // Get admin passwords
        const adminPassword = process.env.ADMIN_PASSWORD
        const adminPassword2 = process.env.ADMIN_PASSWORD2

        if (!adminPassword) {
          throw new Error('Admin password not configured')
        }

        // Check password
        if (
          comparePasswords(credentials.password, adminPassword) ||
          (adminPassword2 &&
            comparePasswords(credentials.password, adminPassword2))
        ) {
          // Coba kirim ke API untuk reset failed attempts
          try {
            const ip =
              (req.headers?.['x-forwarded-for'] as string) ||
              (req.headers?.['x-real-ip'] as string) ||
              'unknown'

            fetch(`${API_URL}/login-attempt`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ attempts: 0 }),
            }).catch((err) =>
              console.error('Failed to report successful login:', err)
            )
          } catch (error) {
            // Lanjutkan meskipun gagal
          }

          // Return objek user dengan properti yang dibutuhkan
          return {
            id: 'zaeniahmad',
            name: 'Zaeni Ahmad',
            email: 'exqeon@gmail.com',
            role: 'admin',
          } as ExtendedUser
        }

        // Report failed login
        try {
          const ip =
            (req.headers?.['x-forwarded-for'] as string) ||
            (req.headers?.['x-real-ip'] as string) ||
            'unknown'

          fetch(`${API_URL}/login-attempt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attempts: 1 }),
          }).catch((err) =>
            console.error('Failed to report login attempt:', err)
          )
        } catch (error) {
          // Lanjutkan meskipun gagal
        }

        return null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Pastikan token menyimpan nilai user.id dan user.role
        token.id = user.id
        token.role = (user as ExtendedUser).role
        token.authTime = Date.now()
      }
      return token
    },
    async session({ session, token }): Promise<ExtendedSession> {
      // Buat objek session yang dikembalikan menyertakan id dan role
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
    maxAge: 60 * 60, // 1 jam
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
