import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId') || decoded.userId

    // Get kitchen history for the student
    const kitchenTurns = await db.kitchenTurnStudent.findMany({
      where: { studentId },
      include: {
        kitchenTurn: {
          include: {
            assignedStudents: {
              include: {
                student: true
              }
            },
            teamLeader: true
          }
        }
      },
      orderBy: {
        kitchenTurn: {
          date: 'desc'
        }
      }
    })

    // Format the response
    const kitchenHistory = kitchenTurns.map(turn => ({
      id: turn.id,
      date: turn.kitchenTurn.date,
      teamMembers: turn.kitchenTurn.assignedStudents.map(assignment => assignment.student.name),
      menu: [], // This would come from FoodMenu table
      status: turn.kitchenTurn.status,
      wasLeader: turn.kitchenTurn.teamLeaderId === studentId,
      notes: turn.kitchenTurn.notes
    }))

    return NextResponse.json({ kitchenHistory })

  } catch (error) {
    console.error('Error fetching kitchen history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}