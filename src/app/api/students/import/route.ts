import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { students } = data

    if (!Array.isArray(students)) {
      return NextResponse.json({ error: 'Students data must be an array' }, { status: 400 })
    }

    const createdStudents: any[] = []

    for (const studentData of students) {
      const { name, email, foodPreference } = studentData

      // Check if student already exists
      const existingStudent = await db.student.findUnique({
        where: { email }
      })

      if (existingStudent) {
        // Update existing student
        const updatedStudent = await db.student.update({
          where: { email },
          data: {
            name,
            foodPreference: foodPreference.toLowerCase(),
            isActive: true,
            isPresent: true,
            isTeamMember: false,
            isJobPlaced: false,
            profileClosed: false
          }
        })
        createdStudents.push(updatedStudent)
      } else {
        // Create new student
        const newStudent = await db.student.create({
          data: {
            name,
            email,
            foodPreference: foodPreference.toLowerCase(),
            isActive: true,
            isPresent: true,
            isTeamMember: false,
            isJobPlaced: false,
            profileClosed: false
          }
        })
        createdStudents.push(newStudent)
      }
    }

    return NextResponse.json({
      message: `Successfully imported ${createdStudents.length} students`,
      students: createdStudents
    })
  } catch (error) {
    console.error('Error importing students:', error)
    return NextResponse.json({ error: 'Failed to import students' }, { status: 500 })
  }
}

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