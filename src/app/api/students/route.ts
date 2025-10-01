import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const students = await db.student.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        discordId: true,
        foodPreference: true,
        workType: true,
        status: true,
        joinedAt: true,
        totalDuties: true,
        lastDutyDate: true
      },
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
    
    const student = await db.student.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password || 'temp123', // Default password for admin creation
        discordId: data.discordId,
        foodPreference: data.foodPreference || 'PANEER',
        workType: data.workType || 'KITCHEN',
        status: data.status || 'ACTIVE'
      }
    })

    return NextResponse.json(student, { status: 201 })
  } catch (error) {
    console.error('Error creating student:', error)
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 })
  }
}