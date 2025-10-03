import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const createKitchenTurnSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  studentIds: z.array(z.string()).min(1, 'At least one student is required'),
  teamLeaderId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, studentIds, teamLeaderId } = createKitchenTurnSchema.parse(body)

    // Check if a kitchen turn already exists for this date
    const existingTurn = await db.kitchenTurn.findFirst({
      where: {
        date: date
      }
    })

    if (existingTurn) {
      return NextResponse.json(
        { message: 'Kitchen turn already exists for this date' },
        { status: 400 }
      )
    }

    // Validate that all students exist and are active
    const students = await db.user.findMany({
      where: {
        id: {
          in: studentIds
        },
        status: 'ACTIVE'
      }
    })

    if (students.length !== studentIds.length) {
      return NextResponse.json(
        { message: 'Some students are not found or not active' },
        { status: 400 }
      )
    }

    // Validate team leader if provided
    let finalTeamLeaderId = teamLeaderId
    if (teamLeaderId && !studentIds.includes(teamLeaderId)) {
      return NextResponse.json(
        { message: 'Team leader must be one of the selected students' },
        { status: 400 }
      )
    }

    // If no team leader specified, use the first student
    if (!finalTeamLeaderId && studentIds.length > 0) {
      finalTeamLeaderId = studentIds[0]
    }

    // Create the kitchen turn
    const kitchenTurn = await db.kitchenTurn.create({
      data: {
        date: date,
        status: 'PENDING',
        teamLeaderId: finalTeamLeaderId,
        assignedStudents: {
          create: studentIds.map(studentId => ({
            studentId: studentId
          }))
        }
      },
      include: {
        assignedStudents: {
          include: {
            student: true
          }
        },
        teamLeader: true
      }
    })

    // Update each student's total kitchen turns
    await Promise.all(
      studentIds.map(studentId =>
        db.user.update({
          where: { id: studentId },
          data: {
            totalKitchenTurns: {
              increment: 1
            }
          }
        })
      )
    )

    return NextResponse.json(kitchenTurn)
  } catch (error) {
    console.error('Error creating kitchen turn:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid input', errors: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}