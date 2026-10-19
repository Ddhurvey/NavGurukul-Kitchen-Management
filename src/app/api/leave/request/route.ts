import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.user) return auth.response
  try {
    const { studentId, reason, startDate, endDate, isEmergency = false } = await request.json()
    if (auth.user.id !== studentId && !['ADMIN', 'FC'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'You can only submit leave for your own account' }, { status: 403 })
    }
    
    // Parse dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    const now = new Date()
    
    // Set times to beginning/end of day
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    
    // Check if it's past 9 PM for tomorrow's assignment
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    
    const ninePM = new Date()
    ninePM.setHours(21, 0, 0, 0)
    
    const isPast9PM = now > ninePM
    
    // Check if leave affects tomorrow's kitchen duty
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
      assignment => assignment.studentId === studentId
    )
    
    // Apply 9 PM rule
    if (isAssignedTomorrow && !isEmergency && isPast9PM) {
      return NextResponse.json(
        { 
          error: 'Leave request rejected. Cannot apply for leave after 9 PM for tomorrow\'s kitchen duty.',
          rule: 'NINE_PM_CUTOFF',
          isPast9PM,
          isAssignedTomorrow
        },
        { status: 400 }
      )
    }
    
    // Create leave request
    const leave = await db.leave.create({
      data: {
        studentId,
        reason,
        startDate: start,
        endDate: end,
        status: isEmergency ? 'APPROVED' : 'PENDING',
        isEmergency
      },
      include: {
        student: true
      }
    })
    
    // If emergency and student is assigned tomorrow, reassign immediately
    if (isEmergency && isAssignedTomorrow) {
      await handleEmergencyReassignment(tomorrow, studentId, auth.user.id)
    }
    
    // If leave is approved before 9 PM and student is assigned tomorrow, reassign immediately
    if (!isEmergency && isAssignedTomorrow && !isPast9PM && leave.status === 'APPROVED') {
      await handleImmediateReassignment(tomorrow, studentId, leave.id, auth.user.id)
    }
    
    // Log the leave request
    await db.historyLog.create({
      data: {
        action: isEmergency ? 'EMERGENCY_LEAVE_CREATED' : 'LEAVE_REQUEST_CREATED',
        updatedBy: studentId,
        metadata: JSON.stringify({
          leaveId: leave.id,
          reason,
          startDate: start,
          endDate: end,
          isEmergency,
          isPast9PM,
          isAssignedTomorrow
        })
      }
    })

    // Send Discord notification for new leave request
    await sendLeaveRequestNotification(leave, isEmergency, isAssignedTomorrow, isPast9PM)
    
    return NextResponse.json({
      success: true,
      message: isEmergency 
        ? 'Emergency leave approved and processed' 
        : 'Leave request submitted successfully',
      leave,
      isPast9PM,
      isAssignedTomorrow
    })
  } catch (error) {
    console.error('Error creating leave request:', error)
    return NextResponse.json(
      { error: 'Failed to create leave request' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.user) return auth.response
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const status = searchParams.get('status')
    
    const where: any = {}
    if (auth.user.role === 'ADMIN' || auth.user.role === 'FC') {
      if (studentId) where.studentId = studentId
    } else {
      where.studentId = auth.user.id
    }
    if (status) where.status = status
    
    const leaves = await db.leave.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json(leaves)
  } catch (error) {
    console.error('Error fetching leave requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leave requests' },
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
    
    const message = `🔄 **Immediate Kitchen Duty Reassignment** 🔄\n\n` +
      `**Date:** ${new Date(assignment.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n` +
      `**New Team Member:** @${replacementStudent.name.replace(/\s+/g, '')}\n\n` +
      `**Reason:** Leave approved before 9 PM cutoff\n\n` +
      `**Note:** Team updated automatically due to approved leave request\n\n` +
      `@Dharamshala Student (current)\n` +
      `Regards,\n` +
      `🤖 Kitchen Bot`
    
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

async function handleEmergencyReassignment(date: Date, excludedStudentId: string, actorId: string) {
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
    
    // Remove the student on emergency leave
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
      
      // Send Discord notification about emergency reassignment
      await sendEmergencyReassignmentNotification(assignment, availableStudents[0])
    }
    
    // Log the emergency reassignment
    await db.historyLog.create({
      data: {
        action: 'EMERGENCY_REASSIGNMENT',
        updatedBy: 'SYSTEM',
        metadata: JSON.stringify({
          date,
          excludedStudentId,
          replacementStudentId: availableStudents[0]?.id,
          originalAssignment: assignment.assignedStudents.map(s => s.studentId)
        })
      }
    })
  } catch (error) {
    console.error('Error handling emergency reassignment:', error)
  }
}

async function sendEmergencyReassignmentNotification(assignment: any, replacementStudent: any) {
  try {
    const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1422903085680033853/mVeuOQhZk7ocLABZG1fTPcNWf4I5rx98gvRYkjSPZx27rzgkdQamXJIPOW7fJLV5nCPF'
    
    const message = `Emergency Kitchen Duty Reassignment for Tomorrow\n\n` +
      `@${replacementStudent.name.replace(/\s+/g, '-')}- ( ${replacementStudent.foodPreference} )\n\n` +
      `Date:- ${new Date(assignment.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n` +
      `Reason:- Emergency leave approved\n\n` +
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
    console.error('Error sending emergency notification:', error)
  }
}

async function sendLeaveRequestNotification(leave: any, isEmergency: boolean, isAssignedTomorrow: boolean, isPast9PM: boolean) {
  try {
    const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1422903085680033853/mVeuOQhZk7ocLABZG1fTPcNWf4I5rx98gvRYkjSPZx27rzgkdQamXJIPOW7fJLV5nCPF'
    
    const startDate = new Date(leave.startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const endDate = new Date(leave.endDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    
    let message = isEmergency 
      ? `Emergency Leave Request\n\n`
      : `New Leave Request\n\n`
    
    message += `@${leave.student.name.replace(/\s+/g, '-')}- ( ${leave.student.foodPreference} )\n\n` +
      `Start Date:- ${startDate}\n` +
      `End Date:- ${endDate}\n` +
      `Reason:- ${leave.reason}\n` +
      `Status:- ${leave.status}\n`
    
    if (isEmergency) {
      message += `Note:- Emergency Leave - Auto-approved and processed immediately\n`
    } else {
      message += `Note:- Pending Approval - Waiting for admin approval\n`
    }
    
    if (isAssignedTomorrow) {
      if (isEmergency) {
        message += `Kitchen Duty:- Student was assigned for tomorrow and has been reassigned\n`
      } else if (isPast9PM) {
        message += `Kitchen Duty:- Student is assigned for tomorrow but request was after 9 PM cutoff\n`
      } else {
        message += `Kitchen Duty:- Student is assigned for tomorrow - will be reassigned if approved\n`
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
    console.error('Error sending leave request notification:', error)
  }
}