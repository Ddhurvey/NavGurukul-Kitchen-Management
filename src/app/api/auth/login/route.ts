import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createStudentSession, getUserRole } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email and password are required' 
      }, { status: 400 })
    }

    // Find student
    const student = await db.student.findUnique({
      where: { email }
    })

    if (!student) {
      return NextResponse.json({ 
        error: 'Invalid email or password' 
      }, { status: 401 })
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, student.password)
    if (!isValidPassword) {
      return NextResponse.json({ 
        error: 'Invalid email or password' 
      }, { status: 401 })
    }

    // Check if student is active
    if (student.status === 'INACTIVE') {
      return NextResponse.json({ 
        error: 'Account is inactive' 
      }, { status: 401 })
    }

    // Create session
    const token = await createStudentSession(student.id)

    // Update last login
    await db.student.update({
      where: { id: student.id },
      data: { lastLoginAt: new Date() }
    })

    const role = getUserRole(student.workType, student.status)

    return NextResponse.json({
      message: 'Login successful',
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        workType: student.workType,
        status: student.status,
        foodPreference: student.foodPreference,
        discordId: student.discordId,
        role
      },
      token
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ 
      error: 'Login failed' 
    }, { status: 500 })
  }
}