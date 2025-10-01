import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const students = await db.student.findMany({
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(students)
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { name, email, foodPreference } = data

    const student = await db.student.create({
      data: {
        name,
        email,
        foodPreference
      }
    })

    return NextResponse.json(student, { status: 201 })
  } catch (error) {
    console.error('Error creating student:', error)
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 })
  }
}