import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getIndiaNextSunday, isIndiaSaturday, formatIndiaDate } from '@/lib/time'
import { sendDiscordNotification } from '@/lib/discord'

export async function POST(request: NextRequest) {
  try {
    const now = new Date()
    const sunday = getIndiaNextSunday()

    // Check if today is Saturday
    const isTodaySaturday = isIndiaSaturday()
    
    if (!isTodaySaturday) {
      return NextResponse.json({
        success: false,
        error: 'This scheduler only runs on Saturdays for Sunday notifications'
      }, { status: 400 })
    }

    console.log(`Running Sunday 9 AM scheduler for ${sunday.toDateString()} (Special Sunday Rule)`)

    // Step 1: Assign Sunday kitchen duty if not already assigned
    const assignmentResult = await assignSundayDuty(sunday)
    
    if (!assignmentResult.success) {
      console.error('Failed to assign Sunday duty:', assignmentResult.error)
      return NextResponse.json({
        success: false,
        error: assignmentResult.error
      }, { status: 500 })
    }

    // Step 2: Lock Sunday assignment (no more changes allowed)
    await lockSundayAssignment(sunday)

    // Step 3: Send special Sunday Discord notification
    const notificationResult = await sendSundayDiscordNotification(sunday, assignmentResult.assignment)

    // Step 4: Log the special Sunday run
    await db.historyLog.create({
      data: {
        action: 'SUNDAY_9AM_SPECIAL_SCHEDULER_RUN',
        updatedBy: 'SYSTEM',
        metadata: JSON.stringify({
          runTime: now.toISOString(),
          sundayDate: sunday.toISOString(),
          assignmentId: assignmentResult.assignment?.id,
          notificationSent: notificationResult.success,
          assignedStudents: assignmentResult.assignment?.assignedStudents?.map((s: any) => s.studentId),
          specialRule: 'SUNDAY_EGG_PANEER_MENU'
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Sunday 9 AM special scheduler completed successfully',
      sundayDate: sunday.toDateString(),
      assignment: assignmentResult.assignment,
      notificationSent: notificationResult.success,
      specialRule: 'SUNDAY_EGG_PANEER_MENU'
    })
  } catch (error) {
    console.error('Error in Sunday 9 AM scheduler:', error)
    
    // Log the error
    await db.historyLog.create({
      data: {
        action: 'SUNDAY_9AM_SCHEDULER_ERROR',
        updatedBy: 'SYSTEM',
        metadata: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        })
      }
    })

    return NextResponse.json(
      { error: 'Failed to run Sunday 9 AM scheduler' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const now = new Date()
    const saturday = new Date()
    const today = now.getDay()
    
    // Find next Saturday
    const daysUntilSaturday = (6 - today + 7) % 7 || 7
    saturday.setDate(saturday.getDate() + daysUntilSaturday)
    saturday.setHours(9, 0, 0, 0) // 9 AM Saturday
    
    const isSaturday9AM = today === 6 && now.getHours() === 9 && now.getMinutes() < 5 // Within 5 minutes of 9 AM on Saturday
    
    return NextResponse.json({
      currentTime: now.toISOString(),
      nextSaturday9AM: saturday.toISOString(),
      isSaturday9AM,
      message: isSaturday9AM ? 'It\'s Saturday 9 AM - Sunday scheduler can run' : 'Not Saturday 9 AM yet'
    })
  } catch (error) {
    console.error('Error checking Sunday scheduler time:', error)
    return NextResponse.json(
      { error: 'Failed to check Sunday scheduler time' },
      { status: 500 }
    )
  }
}

async function assignSundayDuty(sunday: Date) {
  try {
    // Check if assignment already exists
    const existingAssignment = await db.kitchenTurn.findUnique({
      where: { date: sunday },
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
        message: 'Sunday assignment already exists'
      }
    }

    // Use the menu-based assignment system with Sunday special rule
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/assignment/menu-based`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: sunday.toISOString(),
        numberOfStudents: 4, // Sunday might need 4 students for special menu
        force: false
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || 'Failed to assign Sunday duty'
      }
    }

    const result = await response.json()
    return {
      success: true,
      assignment: result.assignment,
      message: 'Successfully assigned Sunday duty with special egg rule'
    }
  } catch (error) {
    console.error('Error assigning Sunday duty:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function lockSundayAssignment(sunday: Date) {
  try {
    await db.kitchenTurn.update({
      where: { date: sunday },
      data: {
        isLocked: true,
        lockedAt: new Date()
      }
    })

    console.log(`Locked Sunday assignment for ${sunday.toDateString()}`)
  } catch (error) {
    console.error('Error locking Sunday assignment:', error)
  }
}

async function sendSundayDiscordNotification(sunday: Date, assignment: any) {
  try {
    if (!assignment || !assignment.assignedStudents) {
      return {
        success: false,
        error: 'No Sunday assignment found to notify'
      }
    }

    // Get Sunday's food menu
    const foodMenu = await db.foodMenu.findUnique({
      where: { date: sunday }
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

    // Send to Discord using central library
    const result = await sendDiscordNotification(message)
    if (!result.success) {
      throw new Error(result.error)
    }

    // Schedule the notification in database
    await db.scheduledNotification.create({
      data: {
        type: 'SUNDAY_SPECIAL_ASSIGNMENT',
        scheduledFor: new Date(),
        sent: true,
        sentAt: new Date(),
        message,
        metadata: JSON.stringify({
          date: sunday.toISOString(),
          assignmentId: assignment.id,
          studentIds: assignment.assignedStudents.map((s: any) => s.studentId),
          specialRule: 'SUNDAY_EGG_PANEER_MENU',
          notificationTime: 'SATURDAY_9AM'
        })
      }
    })

    console.log(`Special Sunday Discord notification sent for ${sunday.toDateString()}`)
    return { success: true }
  } catch (error) {
    console.error('Error sending Sunday Discord notification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}