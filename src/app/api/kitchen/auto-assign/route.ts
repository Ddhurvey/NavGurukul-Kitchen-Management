import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { date, numberOfStudents = 4 } = await request.json()
    
    // Use provided date or tomorrow
    const targetDate = date ? new Date(date) : new Date()
    if (!date) {
      targetDate.setDate(targetDate.getDate() + 1)
    }
    targetDate.setHours(0, 0, 0, 0)

    // Check if assignment already exists for this date
    const existingAssignment = await db.kitchenTurn.findUnique({
      where: { date: targetDate }
    })

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Kitchen assignment already exists for this date' },
        { status: 400 }
      )
    }

    // Get all active students who are not on leave and not FC/Team Members
    const eligibleStudents = await db.user.findMany({
      where: {
        status: 'ACTIVE',
        role: 'STUDENT'
      }
    })

    // Get students who are on leave on the target date
    const leavesOnTargetDate = await db.leave.findMany({
      where: {
        startDate: {
          lte: targetDate
        },
        endDate: {
          gte: targetDate
        },
        status: 'APPROVED'
      }
    })

    const leaveStudentIds = leavesOnTargetDate.map(leave => leave.studentId)

    // Filter out students on leave
    const availableStudents = eligibleStudents.filter(
      student => !leaveStudentIds.includes(student.id)
    )

    if (availableStudents.length < numberOfStudents) {
      return NextResponse.json(
        { error: `Not enough available students. Need ${numberOfStudents}, only ${availableStudents.length} available` },
        { status: 400 }
      )
    }

    // Sort students by number of kitchen turns (ascending) for fair rotation
    const sortedStudents = availableStudents.sort((a, b) => 
      a.totalKitchenTurns - b.totalKitchenTurns
    )

    // Select the students with the least turns
    const selectedStudents = sortedStudents.slice(0, numberOfStudents)
    const teamLeader = selectedStudents[0] // First student becomes team leader

    // Create kitchen turn
    const kitchenTurn = await db.kitchenTurn.create({
      data: {
        date: targetDate,
        status: 'PENDING',
        teamLeaderId: teamLeader.id
      }
    })

    // Assign students to kitchen turn
    await db.kitchenTurnStudent.createMany({
      data: selectedStudents.map(student => ({
        kitchenTurnId: kitchenTurn.id,
        studentId: student.id
      }))
    })

    // Update kitchen turn counts for assigned students
    await Promise.all(
      selectedStudents.map(student =>
        db.user.update({
          where: { id: student.id },
          data: {
            totalKitchenTurns: student.totalKitchenTurns + 1
          }
        })
      )
    )

    // Get the complete assignment with student details
    const completeAssignment = await db.kitchenTurn.findUnique({
      where: { id: kitchenTurn.id },
      include: {
        assignedStudents: {
          include: {
            student: true
          }
        },
        teamLeader: true
      }
    })

    // Log the auto-assignment (using the first assigned student as the updater for now)
    if (selectedStudents.length > 0) {
      await db.historyLog.create({
        data: {
          action: 'AUTO_KITCHEN_ASSIGNMENT',
          updatedBy: selectedStudents[0].id,
          metadata: JSON.stringify({
            date: targetDate,
            assignedStudents: selectedStudents.map(s => s.id),
            teamLeaderId: teamLeader.id,
            algorithm: 'FAIR_ROTATION'
          })
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully assigned kitchen duty for ${targetDate.toLocaleDateString()}`,
      assignment: completeAssignment
    })
  } catch (error) {
    console.error('Error in auto-assignment:', error)
    return NextResponse.json(
      { error: 'Failed to auto-assign kitchen duty' },
      { status: 500 }
    )
  }
}

// Get assignment statistics
export async function GET() {
  try {
    const stats = await db.user.groupBy({
      by: ['totalKitchenTurns'],
      where: {
        status: 'ACTIVE',
        role: 'STUDENT'
      },
      _count: {
        totalKitchenTurns: true
      }
    })

    const totalActiveStudents = await db.user.count({
      where: {
        status: 'ACTIVE',
        role: 'STUDENT'
      }
    })

    const recentAssignments = await db.kitchenTurn.findMany({
      take: 7,
      orderBy: {
        date: 'desc'
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

    return NextResponse.json({
      totalActiveStudents,
      distribution: stats,
      recentAssignments
    })
  } catch (error) {
    console.error('Error fetching assignment stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assignment statistics' },
      { status: 500 }
    )
  }
}