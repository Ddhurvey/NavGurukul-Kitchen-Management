import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ 
        error: 'Token is required' 
      }, { status: 401 })
    }

    const user = await validateSession(token)

    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid or expired token' 
      }, { status: 401 })
    }

    return NextResponse.json({
      user
    })

  } catch (error) {
    console.error('Auth validation error:', error)
    return NextResponse.json({ 
      error: 'Authentication failed' 
    }, { status: 500 })
  }
}