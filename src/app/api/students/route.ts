import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.user) return auth.response
  try {
    const students = await db.user.findMany({
      where: { role: 'STUDENT' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, foodPreference: true, status: true, totalKitchenTurns: true, leaveDays: true, rotationPosition: true, createdAt: true }
    })

    return NextResponse.json(students)
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN'])
  if (!auth.user) return auth.response
  try {
    const data = await request.json()
    const { name, email, password, foodPreference = 'PANEER' } = data
    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Name, email and a password of at least 8 characters are required' }, { status: 400 })
    }

    const student = await db.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: await bcrypt.hash(password, 12),
        role: 'STUDENT',
        status: 'ACTIVE',
        foodPreference
      },
      select: { id: true, name: true, email: true, role: true, status: true, foodPreference: true, createdAt: true }
    })

    return NextResponse.json(student, { status: 201 })
  } catch (error) {
    console.error('Error creating student:', error)
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 })
  }
}