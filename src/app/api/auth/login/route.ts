import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { createAuthToken, getJwtSecret } from '@/lib/auth'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = loginSchema.parse(body)
    
    // Find user
    const user = await db.user.findUnique({
      where: { email: validatedData.email }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(validatedData.password, user.password)
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Account is not active. Please contact administrator.' },
        { status: 401 }
      )
    }
    
    // Fail closed if the deployment has not configured a strong signing secret.
    getJwtSecret()
    const token = createAuthToken({ id: user.id, email: user.email, role: user.role, tokenVersion: user.tokenVersion })
    
    // Create response with user data (without password)
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      foodPreference: user.foodPreference,
      totalKitchenTurns: user.totalKitchenTurns,
      leaveDays: user.leaveDays,
      rotationPosition: user.rotationPosition,
      lastTurnDate: user.lastTurnDate,
      createdAt: user.createdAt
    }
    
    // Set HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: userResponse
    })
    
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // Cookie maxAge is in seconds
      path: '/'
    })
    
    // Log the login
    await db.historyLog.create({
      data: {
        action: 'USER_LOGIN',
        updatedBy: user.id,
        metadata: JSON.stringify({
          loginTime: new Date().toISOString(),
          userAgent: request.headers.get('user-agent') || 'Unknown'
        })
      }
    })
    
    return response
    
  } catch (error) {
    console.error('Login error:', error)
    if (error instanceof Error && error.message.includes('JWT_SECRET')) {
      return NextResponse.json({ error: 'Authentication is not configured on this server' }, { status: 503 })
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    )
  }
}