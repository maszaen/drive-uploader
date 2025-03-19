import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const API_URL = 'https://drvsrv-891166606972.asia-southeast1.run.app'

export async function GET(request: NextRequest) {
  try {
    const clientIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const fingerprint =
      request.cookies.get('device_fingerprint')?.value || 'unknown'

    const response = await fetch(`${API_URL}/is-blocked`, {
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

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({ isBlocked: data.blocked })
    }

    const isBlocked = request.cookies.get('client_blocked')?.value === 'true'
    return NextResponse.json({ isBlocked })
  } catch (error) {
    console.error('Error checking block status:', error)
    const isBlocked = request.cookies.get('client_blocked')?.value === 'true'
    return NextResponse.json({ isBlocked })
  }
}
