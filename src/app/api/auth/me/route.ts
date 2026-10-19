import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const result = await requireAuth(request)
    if (!result.user) return result.response
    const { tokenVersion: _tokenVersion, ...user } = result.user
    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ error: 'Unable to validate session' }, { status: 500 })
  }
}
