import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const API_URL = 'https://drvsrv-891166606972.asia-southeast1.run.app'

export async function GET(request: NextRequest) {
  try {
    // Dapatkan IP client
    const clientIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // Periksa dengan API yang sudah ada
    const response = await fetch(`${API_URL}/is-blocked`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ip: clientIp }),
      cache: 'no-store',
    })

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({ isBlocked: data.blocked })
    }

    // Fallback ke cookie jika API gagal
    const isBlocked = request.cookies.get('ip_blocked')?.value === 'true'
    return NextResponse.json({ isBlocked })
  } catch (error) {
    console.error('Error checking block status:', error)
    // Fallback ke cookie jika terjadi kesalahan
    const isBlocked = request.cookies.get('ip_blocked')?.value === 'true'
    return NextResponse.json({ isBlocked })
  }
}
