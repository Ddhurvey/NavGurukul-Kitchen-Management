import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// Default password for existing users who don't have a password set
const DEFAULT_PASSWORD = 'password123'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json({
        error: 'Email and password are required'
      }, { status: 400 })
    }

    // Find user
    const user = await db.student.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json({
        error: 'Invalid email or password'
      }, { status: 401 })
    }

    // Check password
    let isPasswordValid = false
    
    if (user.password) {
      // User has a password set (registered through the system)
      isPasswordValid = await bcrypt.compare(password, user.password)
    } else {
      // User doesn't have a password (existing user), use default password
      if (password === DEFAULT_PASSWORD) {
        isPasswordValid = true
        
        // Optionally set the default password for future logins
        const hashedDefaultPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10)
        await db.student.update({
          where: { id: user.id },
          data: { password: hashedDefaultPassword }
        })
      }
    }

    if (!isPasswordValid) {
      return NextResponse.json({
        error: 'Invalid email or password'
      }, { status: 401 })
    }

    // Return user data (excluding password)
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        foodPreference: user.foodPreference,
        workAssignment: user.workAssignment,
        isActive: user.isActive,
        isPresent: user.isPresent,
        isTeamMember: user.isTeamMember,
        isJobPlaced: user.isJobPlaced,
        profileClosed: user.profileClosed
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({
      error: 'Login failed'
    }, { status: 500 })
  }
}