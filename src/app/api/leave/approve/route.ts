import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN', 'FC'])
  if (!auth.user) return auth.response
  try {
    const { leaveId, comments } = await request.json()
    const approvedBy = auth.user.id
    
    if (!leaveId || !approvedBy) {
      return NextResponse.json(
        { error: 'Leave ID and approver ID are required' },
        { status: 400 }
      )
    }

    // Get the leave request
    const leave = await db.leave.findUnique({
      where: { id: leaveId },
      include: {
        student: true
      }
    })

    if (!leave) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      )
    }

    if (leave.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Leave request is not pending' },
        { status: 400 }
      )
    }

    // Check if it's past 9 PM for tomorrow's assignment
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    
    const now = new Date()
    const ninePM = new Date()
    ninePM.setHours(21, 0, 0, 0)
    
    const isPast9PM = now > ninePM

    // Check if student is assigned tomorrow
    const tomorrowAssignment = await db.kitchenTurn.findUnique({
      where: { date: tomorrow },
      include: {
        assignedStudents: {
          include: {
            student: true
          }
        }
      }
    })
    
    const isAssignedTomorrow = tomorrowAssignment?.assignedStudents.some(
      assignment => assignment.studentId === leave.studentId
    )

    // Update leave status
    const updatedLeave = await db.leave.update({
      where: { id: leaveId },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
        comments
      }
    })

    // If approved before 9 PM and student is assigned tomorrow, reassign immediately
    if (isAssignedTomorrow && !isPast9PM) {
      await handleImmediateReassignment(tomorrow, leave.studentId, leaveId, auth.user.id)
    }

    // Log the approval
    await db.historyLog.create({
      data: {
        action: 'LEAVE_APPROVED',
        updatedBy: approvedBy,
        metadata: JSON.stringify({
          leaveId,
          studentId: leave.studentId,
          studentName: leave.student.name,
          reason: leave.reason,
          startDate: leave.startDate,
          endDate: leave.endDate,
          approvedBy,
          comments,
          isPast9PM,
          isAssignedTomorrow,
          immediateReassignment: isAssignedTomorrow && !isPast9PM
        })
      }
    })

    // Send Discord notification for leave approval
    await sendLeaveApprovalNotification(leave, approvedBy, isAssignedTomorrow, isPast9PM)

    return NextResponse.json({
      success: true,
      message: 'Leave request approved successfully',
      leave: updatedLeave,
      isAssignedTomorrow,
      immediateReassignment: isAssignedTomorrow && !isPast9PM
    })

  } catch (error) {
    console.error('Error approving leave request:', error)
    return NextResponse.json(
      { error: 'Failed to approve leave request' },
      { status: 500 }
    )
  }
}

async function handleImmediateReassignment(date: Date, excludedStudentId: string, leaveId: string, actorId: string) {
  try {
    // Get tomorrow's assignment
    const assignment = await db.kitchenTurn.findUnique({
      where: { date },
      include: {
        assignedStudents: {
          include: {
            student: true
          }
        },
        teamLeader: true
      }
    })
    
    if (!assignment) return
    
    // Remove the student on approved leave
    await db.kitchenTurnStudent.deleteMany({
      where: {
        kitchenTurnId: assignment.id,
        studentId: excludedStudentId
      }
    })
    
    // If the student was team leader, assign a new one
    if (assignment.teamLeaderId === excludedStudentId) {
      const remainingStudents = assignment.assignedStudents.filter(
        s => s.studentId !== excludedStudentId
      )
      
      if (remainingStudents.length > 0) {
        await db.kitchenTurn.update({
          where: { id: assignment.id },
          data: { teamLeaderId: remainingStudents[0].studentId }
        })
      }
    }
    
    // Find a replacement student
    const availableStudents = await db.user.findMany({
      where: {
        status: 'ACTIVE',
        role: 'STUDENT',
        id: {
          notIn: [
            excludedStudentId,
            ...assignment.assignedStudents.map(s => s.studentId)
          ]
        }
      },
      orderBy: {
        rotationPosition: 'asc'
      }
    })
    
    if (availableStudents.length > 0) {
      // Assign the first available student
      await db.kitchenTurnStudent.create({
        data: {
          kitchenTurnId: assignment.id,
          studentId: availableStudents[0].id
        }
      })
      
      // Update rotation data
      await db.user.update({
        where: { id: availableStudents[0].id },
        data: {
          totalKitchenTurns: { increment: 1 },
          lastTurnDate: date
        }
      })
      
      // Send Discord notification about immediate reassignment
      await sendImmediateReassignmentNotification(assignment, availableStudents[0], excludedStudentId)
    }
    
    // Log the immediate reassignment
    await db.historyLog.create({
      data: {
        action: 'IMMEDIATE_REASSIGNMENT_APPROVED_LEAVE',
        updatedBy: actorId,
        metadata: JSON.stringify({
          date,
          excludedStudentId,
          replacementStudentId: availableStudents[0]?.id,
          originalAssignment: assignment.assignedStudents.map(s => s.studentId),
          leaveId,
          reason: 'APPROVED_LEAVE_BEFORE_9PM_CUTOFF'
        })
      }
    })
  } catch (error) {
    console.error('Error handling immediate reassignment:', error)
  }
}

async function sendImmediateReassignmentNotification(assignment: any, replacementStudent: any, excludedStudentId: string) {
  try {
    const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1422903085680033853/mVeuOQhZk7ocLABZG1fTPcNWf4I5rx98gvRYkjSPZx27rzgkdQamXJIPOW7fJLV5nCPF'
    
    const message = `Kitchen Duty Reassignment for Tomorrow\n\n` +
      `@${replacementStudent.name.replace(/\s+/g, '-')}- ( ${replacementStudent.foodPreference} )\n\n` +
      `Date:- ${new Date(assignment.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n` +
      `Reason:- Leave approved before 9 PM cutoff\n` +
      `Note:- Team updated automatically due to approved leave request\n\n` +
      `@Dharamshala Student (current)\n` +
      `Regards (F.C)`
    
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
        username: 'NavGurukul Kitchen Bot',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/3774/3774290.png'
      })
    })
  } catch (error) {
    console.error('Error sending immediate reassignment notification:', error)
  }
}

async function sendLeaveApprovalNotification(leave: any, approvedBy: string, isAssignedTomorrow: boolean, isPast9PM: boolean) {
  try {
    const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1422903085680033853/mVeuOQhZk7ocLABZG1fTPcNWf4I5rx98gvRYkjSPZx27rzgkdQamXJIPOW7fJLV5nCPF'
    
    const startDate = new Date(leave.startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const endDate = new Date(leave.endDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    
    let message = `Leave Request Approved for ${leave.student.name}\n\n` +
      `@${leave.student.name.replace(/\s+/g, '-')}- ( ${leave.student.foodPreference} )\n\n` +
      `Start Date:- ${startDate}\n` +
      `End Date:- ${endDate}\n` +
      `Reason:- ${leave.reason}\n`
    
    if (isAssignedTomorrow) {
      if (isPast9PM) {
        message += `Note:- Student was assigned for tomorrow's kitchen duty but approval was after 9 PM cutoff. Reassignment will happen tomorrow morning.\n`
      } else {
        message += `Note:- Student was assigned for tomorrow's kitchen duty and has been reassigned immediately.\n`
      }
    }
    
    message += `\n@Dharamshala Student (current)\n` +
      `Regards (F.C)`
    
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
        username: 'NavGurukul Kitchen Bot',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/3774/3774290.png'
      })
    })
  } catch (error) {
    console.error('Error sending leave approval notification:', error)
  }
}