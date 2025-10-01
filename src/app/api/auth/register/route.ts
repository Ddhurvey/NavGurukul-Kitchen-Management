import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, foodPreference, workAssignment } = await request.json()

    // Validate input
    if (!name || !email || !password || !foodPreference || !workAssignment) {
      return NextResponse.json({
        error: 'All fields are required'
      }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({
        error: 'Password must be at least 6 characters long'
      }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await db.student.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({
        error: 'User with this email already exists'
      }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new student
    const student = await db.student.create({
      data: {
        name,
        email,
        password: hashedPassword,
        foodPreference,
        workAssignment,
        isActive: true,
        isPresent: true,
        isTeamMember: workAssignment === 'Team',
        isJobPlaced: false,
        profileClosed: false
      }
    })

    // Store password separately (in a real app, you'd add this to the student model)
    // For now, we'll use a simple approach with a separate table or in-memory storage
    // This is a simplified version - in production, you'd want proper password management

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: student.id,
        name: student.name,
        email: student.email,
        foodPreference: student.foodPreference,
        workAssignment: student.workAssignment
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({
      error: 'Registration failed'
    }, { status: 500 })
  }
}