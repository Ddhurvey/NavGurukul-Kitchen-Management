import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { startDate, endDate, reason, notes } = await request.json()

    if (!startDate || !endDate || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (start < today) {
      return NextResponse.json({ error: 'Cannot apply for leave in the past' }, { status: 400 })
    }

    if (start > end) {
      return NextResponse.json({ error: 'Start date cannot be after end date' }, { status: 400 })
    }

    // Get user details
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      include: {
        kitchenTurns: {
          include: {
            kitchenTurn: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create leave request
    const leaveRequest = await db.leaveRequest.create({
      data: {
        studentId: decoded.userId,
        date: start,
        reason,
        notes,
        status: 'PENDING'
      },
      include: {
        student: true,
        replacementStudent: true
      }
    })

    // Check if we need to auto-process (before 9 PM rule)
    const now = new Date()
    const isSunday = start.getDay() === 0
    const cutoffTime = isSunday 
      ? new Date(start.setHours(9, 0, 0, 0)) // 9 AM Saturday for Sunday
      : new Date(start.setHours(21, 0, 0, 0)) // 9 PM for other days

    if (now < cutoffTime) {
      // Auto-process leave request
      await processLeaveRequest(leaveRequest.id, decoded.userId)
    }

    return NextResponse.json({ 
      message: 'Leave request submitted successfully',
      leaveRequest 
    })

  } catch (error) {
    console.error('Error creating leave request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const leaveRequests = await db.leaveRequest.findMany({
      where: { studentId: decoded.userId },
      include: {
        student: true,
        replacementStudent: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ leaveRequests })

  } catch (error) {
    console.error('Error fetching leave requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function processLeaveRequest(leaveRequestId: string, userId: string) {
  try {
    const leaveRequest = await db.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        student: true
      }
    })

    if (!leaveRequest) {
      return
    }

    // Find kitchen turn for the leave date
    const kitchenTurn = await db.kitchenTurn.findFirst({
      where: {
        date: leaveRequest.date
      },
      include: {
        assignedStudents: {
          include: {
            student: true
          }
        }
      }
    })

    if (!kitchenTurn) {
      // No kitchen turn found, just approve the leave
      await db.leaveRequest.update({
        where: { id: leaveRequestId },
        data: { 
          status: 'APPROVED',
          processedAt: new Date(),
          processedBy: userId,
          autoReplaced: true
        }
      })
      return
    }

    // Check if student is assigned to this kitchen turn
    const assignedStudent = kitchenTurn.assignedStudents.find(
      assignment => assignment.studentId === userId
    )

    if (!assignedStudent) {
      // Student not assigned, just approve the leave
      await db.leaveRequest.update({
        where: { id: leaveRequestId },
        data: { 
          status: 'APPROVED',
          processedAt: new Date(),
          processedBy: userId,
          autoReplaced: true
        }
      })
      return
    }

    // Find replacement student
    const replacementStudent = await findReplacementStudent(kitchenTurn, userId)

    if (replacementStudent) {
      // Remove original student and add replacement
      await db.kitchenTurnStudent.delete({
        where: {
          kitchenTurnId_studentId: {
            kitchenTurnId: kitchenTurn.id,
            studentId: userId
          }
        }
      })

      await db.kitchenTurnStudent.create({
        data: {
          kitchenTurnId: kitchenTurn.id,
          studentId: replacementStudent.id
        }
      })

      // Update leave request
      await db.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          status: 'PROCESSED',
          replacementStudentId: replacementStudent.id,
          processedAt: new Date(),
          processedBy: userId,
          autoReplaced: true
        }
      })

      // Create swap history
      await db.swapHistory.create({
        data: {
          originalStudentId: userId,
          replacementStudentId: replacementStudent.id,
          kitchenTurnId: kitchenTurn.id,
          swapReason: 'LEAVE',
          reason: `Leave: ${leaveRequest.reason}`,
          approvedBy: userId,
          approvedAt: new Date()
        }
      })
    } else {
      // No replacement found, just approve the leave
      await db.leaveRequest.update({
        where: { id: leaveRequestId },
        data: { 
          status: 'APPROVED',
          processedAt: new Date(),
          processedBy: userId,
          autoReplaced: true
        }
      })
    }

  } catch (error) {
    console.error('Error processing leave request:', error)
  }
}

async function findReplacementStudent(kitchenTurn: any, excludeUserId: string) {
  try {
    // Get all active students
    const allStudents = await db.user.findMany({
      where: {
        status: 'ACTIVE',
        id: { not: excludeUserId }
      }
    })

    // Get students already assigned to this kitchen turn
    const assignedStudentIds = kitchenTurn.assignedStudents.map(
      (assignment: any) => assignment.studentId
    )

    // Get students on leave for this date
    const leaveRequests = await db.leaveRequest.findMany({
      where: {
        date: kitchenTurn.date,
        status: { in: ['PENDING', 'APPROVED', 'PROCESSED'] }
      }
    })

    const onLeaveStudentIds = leaveRequests.map(lr => lr.studentId)

    // Find available students
    const availableStudents = allStudents.filter(student => 
      !assignedStudentIds.includes(student.id) && 
      !onLeaveStudentIds.includes(student.id)
    )

    if (availableStudents.length === 0) {
      return null
    }

    // Simple selection: pick the student with least kitchen turns
    return availableStudents.reduce((prev, current) => 
      prev.totalKitchenTurns < current.totalKitchenTurns ? prev : current
    )

  } catch (error) {
    console.error('Error finding replacement student:', error)
    return null
  }
}