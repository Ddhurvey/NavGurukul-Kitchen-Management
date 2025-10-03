import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { action, adminId, data } = await request.json()
    
    // Verify admin privileges (in a real app, you'd check session/auth)
    const admin = await db.user.findUnique({
      where: { id: adminId }
    })
    
    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'FC' && admin.role !== 'TEAM_MEMBER')) {
      return NextResponse.json(
        { error: 'Insufficient privileges' },
        { status: 403 }
      )
    }

    let result
    
    switch (action) {
      case 'MANUAL_ASSIGNMENT':
        result = await handleManualAssignment(data, adminId)
        break
      case 'EMERGENCY_REASSIGNMENT':
        result = await handleEmergencyReassignment(data, adminId)
        break
      case 'OVERRIDE_LOCK':
        result = await handleOverrideLock(data, adminId)
        break
      case 'MANUAL_LEAVE_APPROVAL':
        result = await handleManualLeaveApproval(data, adminId)
        break
      case 'EDIT_HISTORY':
        result = await handleEditHistory(data, adminId)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Log the admin action
    await db.historyLog.create({
      data: {
        action: `ADMIN_${action}`,
        updatedBy: adminId,
        metadata: JSON.stringify({
          ...data,
          result: result.success ? 'SUCCESS' : 'FAILED',
          timestamp: new Date().toISOString()
        })
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in admin override:', error)
    return NextResponse.json(
      { error: 'Failed to perform admin action' },
      { status: 500 }
    )
  }
}

async function handleManualAssignment(data: any, adminId: string) {
  try {
    const { date, studentIds, teamLeaderId, reason } = data
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)

    // Check if assignment exists
    const existingAssignment = await db.kitchenTurn.findUnique({
      where: { date: targetDate }
    })

    if (existingAssignment && existingAssignment.isLocked) {
      return {
        success: false,
        error: 'Assignment is locked. Use override lock option to proceed.'
      }
    }

    // Create or update assignment
    const kitchenTurn = await db.kitchenTurn.upsert({
      where: { date: targetDate },
      update: {
        teamLeaderId,
        status: 'PENDING'
      },
      create: {
        date: targetDate,
        teamLeaderId,
        status: 'PENDING'
      }
    })

    // Remove existing assignments
    await db.kitchenTurnStudent.deleteMany({
      where: { kitchenTurnId: kitchenTurn.id }
    })

    // Add new assignments
    await db.kitchenTurnStudent.createMany({
      data: studentIds.map((studentId: string) => ({
        kitchenTurnId: kitchenTurn.id,
        studentId
      }))
    })

    // Update student turn counts
    await Promise.all(
      studentIds.map((studentId: string) =>
        db.user.update({
          where: { id: studentId },
          data: {
            totalKitchenTurns: { increment: 1 },
            lastTurnDate: targetDate
          }
        })
      )
    )

    return {
      success: true,
      message: 'Manual assignment completed successfully',
      assignmentId: kitchenTurn.id
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function handleEmergencyReassignment(data: any, adminId: string) {
  try {
    const { date, originalStudentId, replacementStudentId, reason } = data
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)

    const assignment = await db.kitchenTurn.findUnique({
      where: { date: targetDate },
      include: {
        assignedStudents: true
      }
    })

    if (!assignment) {
      return {
        success: false,
        error: 'No assignment found for this date'
      }
    }

    // Remove original student
    await db.kitchenTurnStudent.deleteMany({
      where: {
        kitchenTurnId: assignment.id,
        studentId: originalStudentId
      }
    })

    // Add replacement student
    await db.kitchenTurnStudent.create({
      data: {
        kitchenTurnId: assignment.id,
        studentId: replacementStudentId
      }
    })

    // Update team leader if needed
    if (assignment.teamLeaderId === originalStudentId) {
      await db.kitchenTurn.update({
        where: { id: assignment.id },
        data: { teamLeaderId: replacementStudentId }
      })
    }

    // Update turn counts
    await db.user.update({
      where: { id: replacementStudentId },
      data: {
        totalKitchenTurns: { increment: 1 },
        lastTurnDate: targetDate
      }
    })

    return {
      success: true,
      message: 'Emergency reassignment completed successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function handleOverrideLock(data: any, adminId: string) {
  try {
    const { date, lockAction } = data // lockAction: 'lock' or 'unlock'
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)

    const updatedAssignment = await db.kitchenTurn.update({
      where: { date: targetDate },
      data: {
        isLocked: lockAction === 'lock',
        lockedAt: lockAction === 'lock' ? new Date() : null
      }
    })

    return {
      success: true,
      message: `Assignment ${lockAction}ed successfully`,
      isLocked: updatedAssignment.isLocked
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function handleManualLeaveApproval(data: any, adminId: string) {
  try {
    const { leaveId, status, reason } = data

    const updatedLeave = await db.leave.update({
      where: { id: leaveId },
      data: {
        status,
        approvedBy: adminId
      }
    })

    // If leave is approved and affects future assignments, handle reassignment
    if (status === 'APPROVED') {
      await handleLeaveReassignment(updatedLeave)
    }

    return {
      success: true,
      message: `Leave ${status.toLowerCase()} successfully`,
      leave: updatedLeave
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function handleEditHistory(data: any, adminId: string) {
  try {
    const { historyId, newMetadata } = data

    const updatedHistory = await db.historyLog.update({
      where: { id: historyId },
      data: {
        metadata: JSON.stringify(newMetadata)
      }
    })

    return {
      success: true,
      message: 'History updated successfully',
      history: updatedHistory
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function handleLeaveReassignment(leave: any) {
  try {
    // Check if leave affects any future assignments
    const futureAssignments = await db.kitchenTurn.findMany({
      where: {
        date: {
          gte: leave.startDate
        }
      },
      include: {
        assignedStudents: true
      }
    })

    for (const assignment of futureAssignments) {
      const isStudentAssigned = assignment.assignedStudents.some(
        s => s.studentId === leave.studentId
      )

      if (isStudentAssigned) {
        // Find replacement student
        const availableStudents = await db.user.findMany({
          where: {
            status: 'ACTIVE',
            role: 'STUDENT',
            id: {
              notIn: [
                leave.studentId,
                ...assignment.assignedStudents.map(s => s.studentId)
              ]
            }
          },
          orderBy: {
            rotationPosition: 'asc'
          }
        })

        if (availableStudents.length > 0) {
          // Replace the student
          await db.kitchenTurnStudent.deleteMany({
            where: {
              kitchenTurnId: assignment.id,
              studentId: leave.studentId
            }
          })

          await db.kitchenTurnStudent.create({
            data: {
              kitchenTurnId: assignment.id,
              studentId: availableStudents[0].id
            }
          })

          // Update team leader if needed
          if (assignment.teamLeaderId === leave.studentId) {
            await db.kitchenTurn.update({
              where: { id: assignment.id },
              data: { teamLeaderId: availableStudents[0].id }
            })
          }
        }
      }
    }
  } catch (error) {
    console.error('Error handling leave reassignment:', error)
  }
}