import { NextRequest, NextResponse } from 'next/server'
import { deleteSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ 
        error: 'Token is required' 
      }, { status: 400 })
    }

    // Delete session
    await deleteSession(token)

    return NextResponse.json({
      message: 'Logout successful'
    })

  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ 
      error: 'Logout failed' 
    }, { status: 500 })
  }
}