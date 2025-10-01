import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createStudentSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, discordId, foodPreference } = await request.json()

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json({ 
        error: 'Name, email, and password are required' 
      }, { status: 400 })
    }

    // Check if student already exists
    const existingStudent = await db.student.findUnique({
      where: { email }
    })

    if (existingStudent) {
      return NextResponse.json({ 
        error: 'Student with this email already exists' 
      }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create new student
    const student = await db.student.create({
      data: {
        name,
        email,
        password: hashedPassword,
        discordId,
        foodPreference: foodPreference || 'PANEER',
        workType: 'KITCHEN',
        status: 'ACTIVE'
      }
    })

    // Create session
    const token = await createStudentSession(student.id)

    // Update last login
    await db.student.update({
      where: { id: student.id },
      data: { lastLoginAt: new Date() }
    })

    return NextResponse.json({
      message: 'Registration successful',
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        workType: student.workType,
        status: student.status,
        foodPreference: student.foodPreference,
        discordId: student.discordId
      },
      token
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ 
      error: 'Registration failed' 
    }, { status: 500 })
  }
}