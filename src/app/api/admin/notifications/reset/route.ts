import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getIndiaToday, getIndiaTomorrow, isIndiaSaturday } from '@/lib/time'

export async function POST(request: NextRequest) {
  try {
    const { adminKey } = await request.json()
    
    if (adminKey !== process.env.ADMIN_RESET_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔄 Resetting notification system...')

    // Step 1: Clear all existing scheduled notifications
    const deletedCount = await db.scheduledNotification.deleteMany({})
    console.log(`✅ Cleared ${deletedCount.count} scheduled notifications`)

    // Step 2: Get current active rotation cycle
    const activeCycle = await db.rotationCycle.findFirst({
      where: { isActive: true }
    })

    if (!activeCycle) {
      console.log('⚠️ No active rotation cycle found. Skipping notification scheduling.')
      return NextResponse.json({
        success: true,
        message: 'Notification system reset. No active cycle to schedule.',
        notificationsScheduled: 0
      })
    }

    // Step 3: Schedule new notifications
    const scheduledNotifications = await scheduleNotificationsForCycle(activeCycle)

    // Step 4: Log the reset
    await db.historyLog.create({
      data: {
        action: 'NOTIFICATION_SYSTEM_RESET',
        updatedBy: 'SYSTEM_ADMIN',
        metadata: JSON.stringify({
          resetTime: new Date().toISOString(),
          cycleId: activeCycle.id,
          notificationsScheduled: scheduledNotifications.length,
          clearedNotifications: deletedCount.count
        })
      }
    })

    console.log(`🎉 Notification system reset completed. Scheduled ${scheduledNotifications.length} notifications.`)

    return NextResponse.json({
      success: true,
      message: 'Notification system reset successfully',
      data: {
        cycleId: activeCycle.id,
        notificationsScheduled: scheduledNotifications.length,
        clearedNotifications: deletedCount.count,
        scheduledNotifications: scheduledNotifications.map(n => ({
          type: n.type,
          scheduledFor: n.scheduledFor,
          message: n.message
        }))
      }
    })

  } catch (error) {
    console.error('❌ Error resetting notification system:', error)
    return NextResponse.json(
      { error: 'Failed to reset notification system' },
      { status: 500 }
    )
  }
}

async function scheduleNotificationsForCycle(cycle: any) {
  const today = getIndiaToday()
  const tomorrow = getIndiaTomorrow()
  const scheduledNotifications = []

  // Schedule daily 9 PM notifications for the next 7 days
  for (let i = 1; i <= 7; i++) {
    const targetDate = new Date(today)
    targetDate.setDate(targetDate.getDate() + i)
    targetDate.setHours(21, 0, 0, 0) // 9 PM

    // Check if target date is Sunday
    const targetDayIndia = new Date(targetDate.getTime() + (5.5 * 3600000)).getDay()
    
    if (targetDayIndia === 0) { // Sunday
      // Skip Sunday 9 PM (handled by Saturday 9 AM)
      console.log(`⏭️ Skipping Sunday 9 PM notification for ${targetDate.toDateString()}`)
      continue
    }

    const notification = await db.scheduledNotification.create({
      data: {
        type: 'DAILY_KITCHEN_ASSIGNMENT',
        scheduledFor: targetDate,
        sent: false,
        message: `Pending: Daily kitchen assignment notification for ${targetDate.toDateString()}`,
        metadata: JSON.stringify({
          scheduledDate: targetDate.toISOString(),
          type: 'DAILY_9PM_SCHEDULER',
          cycleId: cycle.id,
          dayOffset: i
        })
      }
    })

    scheduledNotifications.push(notification)
    console.log(`📅 Scheduled daily 9 PM notification for ${targetDate.toDateString()}`)
  }

  // Schedule Sunday 9 AM notifications for the next 4 Sundays
  for (let i = 0; i < 4; i++) {
    const sundayDate = new Date(today)
    const daysUntilSunday = ((7 - sundayDate.getDay()) % 7) || 7
    sundayDate.setDate(sundayDate.getDate() + daysUntilSunday + (i * 7))
    sundayDate.setHours(9, 0, 0, 0) // 9 AM

    // Adjust for India timezone (UTC+5:30)
    const sundayIndiaTime = new Date(sundayDate.getTime() + (5.5 * 3600000))

    const notification = await db.scheduledNotification.create({
      data: {
        type: 'SUNDAY_SPECIAL_ASSIGNMENT',
        scheduledFor: sundayDate,
        sent: false,
        message: `Pending: Sunday special assignment notification for ${sundayIndiaTime.toDateString()}`,
        metadata: JSON.stringify({
          scheduledDate: sundayDate.toISOString(),
          type: 'SUNDAY_9AM_SCHEDULER',
          cycleId: cycle.id,
          weekOffset: i + 1
        })
      }
    })

    scheduledNotifications.push(notification)
    console.log(`🥚🧀 Scheduled Sunday 9 AM special notification for ${sundayIndiaTime.toDateString()}`)
  }

  // Schedule immediate notification if there's a kitchen duty for tomorrow
  const tomorrowKitchenTurn = await db.kitchenTurn.findUnique({
    where: { date: tomorrow },
    include: {
      assignedStudents: {
        include: { student: true }
      }
    }
  })

  if (tomorrowKitchenTurn && tomorrowKitchenTurn.assignedStudents.length > 0) {
    const immediateNotification = await db.scheduledNotification.create({
      data: {
        type: 'IMMEDIATE_KITCHEN_ASSIGNMENT',
        scheduledFor: new Date(),
        sent: false,
        message: `Pending: Immediate notification for tomorrow's kitchen assignment`,
        metadata: JSON.stringify({
          scheduledDate: new Date().toISOString(),
          type: 'IMMEDIATE_NOTIFICATION',
          tomorrowDate: tomorrow.toISOString(),
          assignedStudents: tomorrowKitchenTurn.assignedStudents.map(as => as.student.name)
        })
      }
    })

    scheduledNotifications.push(immediateNotification)
    console.log(`⚡ Scheduled immediate notification for tomorrow's kitchen duty`)
  }

  return scheduledNotifications
}

// GET endpoint to check notification status
export async function GET() {
  try {
    const notifications = await db.scheduledNotification.findMany({
      orderBy: { scheduledFor: 'asc' },
      take: 20
    })

    const pendingCount = await db.scheduledNotification.count({
      where: { sent: false }
    })

    const sentCount = await db.scheduledNotification.count({
      where: { sent: true }
    })

    const nextNotification = await db.scheduledNotification.findFirst({
      where: { sent: false },
      orderBy: { scheduledFor: 'asc' }
    })

    return NextResponse.json({
      status: {
        total: notifications.length,
        pending: pendingCount,
        sent: sentCount
      },
      nextNotification: nextNotification ? {
        type: nextNotification.type,
        scheduledFor: nextNotification.scheduledFor,
        message: nextNotification.message
      } : null,
      recentNotifications: notifications.slice(0, 10).map(n => ({
        id: n.id,
        type: n.type,
        scheduledFor: n.scheduledFor,
        sent: n.sent,
        sentAt: n.sentAt,
        message: n.message
      }))
    })
  } catch (error) {
    console.error('Error checking notification status:', error)
    return NextResponse.json(
      { error: 'Failed to check notification status' },
      { status: 500 }
    )
  }
}