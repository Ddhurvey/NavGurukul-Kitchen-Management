import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getIndiaTomorrow, isIndiaSunday, formatIndiaDate } from '@/lib/time'
import { sendDiscordNotification } from '@/lib/discord'

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1422903085680033853/mVeuOQhZk7ocLABZG1fTPcNWf4I5rx98gvRYkjSPZx27rzgkdQamXJIPOW7fJLV5nCPF'

export async function POST(request: NextRequest) {
  try {
    const now = new Date()
    const tomorrow = getIndiaTomorrow()

    // Check if tomorrow is Sunday - if so, skip (handled by Saturday 9 AM scheduler)
    const isTomorrowSunday = isIndiaSunday()
    
    if (isTomorrowSunday) {
      console.log(`Skipping 9 PM scheduler for ${tomorrow.toDateString()} - Sunday is handled by Saturday 9 AM scheduler`)
      
      // Log the skip
      await db.historyLog.create({
        data: {
          action: 'DAILY_9PM_SCHEDULER_SKIP_SUNDAY',
          updatedBy: 'SYSTEM',
          metadata: JSON.stringify({
            runTime: now.toISOString(),
            tomorrowDate: tomorrow.toISOString(),
            reason: 'SUNDAY_HANDLED_BY_SATURDAY_9AM_SCHEDULER',
            nextRun: 'MONDAY_NOTIFICATION'
          })
        }
      })

      return NextResponse.json({
        success: true,
        message: '9 PM scheduler skipped - Sunday is handled by Saturday 9 AM scheduler',
        tomorrowDate: tomorrow.toDateString(),
        skipped: true,
        reason: 'SUNDAY_SPECIAL_RULE'
      })
    }

    console.log(`Running 9 PM daily scheduler for ${tomorrow.toDateString()}`)

    // Step 1: Assign tomorrow's kitchen duty if not already assigned
    const assignmentResult = await assignTomorrowDuty(tomorrow)
    
    if (!assignmentResult.success) {
      console.error('Failed to assign tomorrow\'s duty:', assignmentResult.error)
      return NextResponse.json({
        success: false,
        error: assignmentResult.error
      }, { status: 500 })
    }

    // Step 2: Lock tomorrow's assignment (no more changes allowed)
    await lockTomorrowAssignment(tomorrow)

    // Step 3: Send Discord notification
    const notificationResult = await sendDailyDiscordNotification(tomorrow, assignmentResult.assignment)

    // Step 4: Schedule next day's notification
    await scheduleNextNotification()

    // Step 5: Log the daily run
    await db.historyLog.create({
      data: {
        action: 'DAILY_9PM_SCHEDULER_RUN',
        updatedBy: 'SYSTEM',
        metadata: JSON.stringify({
          runTime: now.toISOString(),
          tomorrowDate: tomorrow.toISOString(),
          assignmentId: assignmentResult.assignment?.id,
          notificationSent: notificationResult.success,
          assignedStudents: assignmentResult.assignment?.assignedStudents?.map((s: any) => s.studentId),
          dayOfWeek: formatIndiaDate(tomorrow)
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: '9 PM daily scheduler completed successfully',
      tomorrowDate: tomorrow.toDateString(),
      assignment: assignmentResult.assignment,
      notificationSent: notificationResult.success,
      dayOfWeek: formatIndiaDate(tomorrow)
    })
  } catch (error) {
    console.error('Error in 9 PM daily scheduler:', error)
    
    // Log the error
    await db.historyLog.create({
      data: {
        action: 'DAILY_9PM_SCHEDULER_ERROR',
        updatedBy: 'SYSTEM',
        metadata: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        })
      }
    })

    return NextResponse.json(
      { error: 'Failed to run 9 PM daily scheduler' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const now = new Date()
    const ninePM = new Date()
    ninePM.setHours(21, 0, 0, 0)
    
    const is9PMTime = Math.abs(now.getTime() - ninePM.getTime()) < 60000 // Within 1 minute
    
    return NextResponse.json({
      currentTime: now.toISOString(),
      ninePMTime: ninePM.toISOString(),
      is9PMTime,
      message: is9PMTime ? 'It\'s 9 PM - scheduler can run' : 'Not 9 PM yet'
    })
  } catch (error) {
    console.error('Error checking scheduler time:', error)
    return NextResponse.json(
      { error: 'Failed to check scheduler time' },
      { status: 500 }
    )
  }
}

async function assignTomorrowDuty(tomorrow: Date) {
  try {
    // Check if assignment already exists
    const existingAssignment = await db.kitchenTurn.findUnique({
      where: { date: tomorrow },
      include: {
        assignedStudents: {
          include: {
            student: true
          }
        }
      }
    })

    if (existingAssignment && existingAssignment.assignedStudents.length > 0) {
      return {
        success: true,
        assignment: existingAssignment,
        message: 'Assignment already exists'
      }
    }

    // Use the advanced rotation system
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/rotation/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: tomorrow.toISOString(),
        numberOfStudents: 4
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || 'Failed to assign tomorrow\'s duty'
      }
    }

    const result = await response.json()
    return {
      success: true,
      assignment: result.assignment,
      message: 'Successfully assigned tomorrow\'s duty'
    }
  } catch (error) {
    console.error('Error assigning tomorrow duty:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function lockTomorrowAssignment(tomorrow: Date) {
  try {
    await db.kitchenTurn.update({
      where: { date: tomorrow },
      data: {
        isLocked: true,
        lockedAt: new Date()
      }
    })

    console.log(`Locked assignment for ${tomorrow.toDateString()}`)
  } catch (error) {
    console.error('Error locking tomorrow assignment:', error)
  }
}

async function sendDailyDiscordNotification(tomorrow: Date, assignment: any) {
  try {
    if (!assignment || !assignment.assignedStudents) {
      return {
        success: false,
        error: 'No assignment found to notify'
      }
    }

    // Get tomorrow's food menu
    const foodMenu = await db.foodMenu.findUnique({
      where: { date: tomorrow }
    })

    let message = `Food menu for Tommorow\n\n`

    // Add team members
    assignment.assignedStudents.forEach((assignmentStudent: any) => {
      const student = assignmentStudent.student
      const isTL = assignment.teamLeaderId === student.id
      const tl = isTL ? ' (T.L)' : ''
      const preference = student.foodPreference || 'GENERAL'
      message += `@${student.name.replace(/\s+/g, '-')}- ( ${preference} )${tl}\n`
    })

    message += '\n'

    // Add food menu if available
    if (foodMenu) {
      message += `Breakfast:- ${foodMenu.breakfast || '(none)'}\n`
      message += `Lunch:- ${foodMenu.lunch || '(none)'}\n`
      message += `Dinner:- ${foodMenu.dinner || '(none)'}\n\n`
    }

    message += `@Dharamshala Student (current)\n`
    message += `Regards (F.C)`

    // Send to Discord
    const response = await fetch(DISCORD_WEBHOOK_URL, {
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

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.statusText}`)
    }

    // Schedule the notification in database
    await db.scheduledNotification.create({
      data: {
        type: 'DAILY_KITCHEN_ASSIGNMENT',
        scheduledFor: new Date(),
        sent: true,
        sentAt: new Date(),
        message,
        metadata: JSON.stringify({
          date: tomorrow.toISOString(),
          assignmentId: assignment.id,
          studentIds: assignment.assignedStudents.map((s: any) => s.studentId)
        })
      }
    })

    console.log(`Daily Discord notification sent for ${tomorrow.toDateString()}`)
    return { success: true }
  } catch (error) {
    console.error('Error sending daily Discord notification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function scheduleNextNotification() {
  try {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(21, 0, 0, 0) // 9 PM tomorrow

    await db.scheduledNotification.create({
      data: {
        type: 'DAILY_KITCHEN_ASSIGNMENT',
        scheduledFor: tomorrow,
        sent: false,
        message: 'Pending: Daily kitchen assignment notification',
        metadata: JSON.stringify({
          scheduledDate: tomorrow.toISOString(),
          type: 'DAILY_9PM_SCHEDULER'
        })
      }
    })

    console.log(`Scheduled next notification for ${tomorrow.toISOString()}`)
  } catch (error) {
    console.error('Error scheduling next notification:', error)
  }
}