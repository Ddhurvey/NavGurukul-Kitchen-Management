import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getIndiaToday, isIndiaPast9PM } from '@/lib/time'
import { RotationService } from '@/lib/rotation-service'

export async function GET() {
  try {
    const today = getIndiaToday()
    
    let kitchenTurn = await db.kitchenTurn.findUnique({
      where: {
        date: today
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

    if (!kitchenTurn) {
      // Try to create today's kitchen turn using rotation system
      try {
        const assignment = await RotationService.createKitchenAssignment(today)
        
        // Fetch the created assignment with full details
        kitchenTurn = await db.kitchenTurn.findUnique({
          where: {
            date: today
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
      } catch (rotationError) {
        console.error('Could not create rotation assignment:', rotationError)
        
        // Fallback: create empty turn if rotation fails
        const newTurn = await db.kitchenTurn.create({
          data: {
            date: today,
            status: 'PENDING'
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
        kitchenTurn = newTurn
      }
    } else if (kitchenTurn.assignedStudents.length === 0) {
      // If kitchen turn exists but has no students, try to assign using rotation
      try {
        const assignment = await RotationService.createKitchenAssignment(today)
        
        // Fetch the updated assignment with full details
        kitchenTurn = await db.kitchenTurn.findUnique({
          where: {
            date: today
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
      } catch (rotationError) {
        console.error('Could not update empty turn with rotation assignment:', rotationError)
        // Keep the empty turn if rotation fails
      }
    }

    return NextResponse.json(kitchenTurn)
  } catch (error) {
    console.error('Error fetching today\'s kitchen turn:', error)
    return NextResponse.json(
      { error: 'Failed to fetch kitchen turn' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { assignedStudents, teamLeaderId } = await request.json()
    
    const today = getIndiaToday()

    // Check if it's past 9 PM India time (can't edit today's kitchen duty after 9 PM)
    if (isIndiaPast9PM()) {
      return NextResponse.json(
        { error: 'Cannot edit today\'s kitchen duty after 9:00 PM' },
        { status: 400 }
      )
    }

    // Validate that exactly 4 students are assigned
    if (!assignedStudents || assignedStudents.length !== 4) {
      return NextResponse.json(
        { error: 'Exactly 4 students must be assigned to kitchen duty' },
        { status: 400 }
      )
    }

    // Delete existing assignments for today
    await db.kitchenTurnStudent.deleteMany({
      where: {
        kitchenTurn: {
          date: today
        }
      }
    })

    // Update or create today's kitchen turn
    const kitchenTurn = await db.kitchenTurn.upsert({
      where: {
        date: today
      },
      update: {
        teamLeaderId,
        status: 'PENDING'
      },
      create: {
        date: today,
        teamLeaderId,
        status: 'PENDING'
      }
    })

    // Assign students to kitchen turn
    if (assignedStudents && assignedStudents.length > 0) {
      await db.kitchenTurnStudent.createMany({
        data: assignedStudents.map((studentId: string) => ({
          kitchenTurnId: kitchenTurn.id,
          studentId
        }))
      })
    }

    // Log the action
    await db.historyLog.create({
      data: {
        action: 'KITCHEN_TURN_UPDATED',
        updatedBy: teamLeaderId || 'SYSTEM',
        metadata: JSON.stringify({
          date: today,
          assignedStudents,
          teamLeaderId,
          updatedAt: new Date()
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating kitchen turn:', error)
    return NextResponse.json(
      { error: 'Failed to update kitchen turn' },
      { status: 500 }
    )
  }
}