// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const API_URL = 'https://drvsrv-891166606972.asia-southeast1.run.app'

async function isClientBlocked(request: NextRequest) {
  const clientIp =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown'

  const fingerprint =
    request.cookies.get('device_fingerprint')?.value || 'unknown'

  try {
    const blockResponse = await fetch(`${API_URL}/is-blocked`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ip: clientIp,
        fingerprint: fingerprint,
      }),
      cache: 'no-store',
    })

    if (blockResponse.ok) {
      const blockData = await blockResponse.json()
      return blockData.blocked
    }
  } catch (error) {
    console.error('Error checking block status:', error)
  }

  return false
}

export async function middleware(request: NextRequest) {
  const publicPaths = [
    '/login',
    '/_next',
    '/images',
    '/api/auth',
    '/favicon.ico',
  ]

  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (
    request.nextUrl.pathname.includes('/api/auth/callback/credentials') ||
    request.nextUrl.pathname.includes('/api/auth/signin/credentials')
  ) {
    const isBlocked = await isClientBlocked(request)

    if (isBlocked) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      )
    }
  }

  if (isPublicPath) {
    return NextResponse.next()
  }

  const session = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!session) {
    const url = new URL('/login', request.url)
    return NextResponse.redirect(url)
  }

  const response = NextResponse.next()

  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'"
  )

  return response
}
