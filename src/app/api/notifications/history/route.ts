import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN'])
  if (!auth.user) return auth.response
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let where: any = {}
    
    // Filter by type if provided
    if (type) {
      where.type = type
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      where.scheduledFor = {}
      if (startDate) where.scheduledFor.gte = new Date(startDate)
      if (endDate) where.scheduledFor.lte = new Date(endDate)
    }

    const notifications = await db.scheduledNotification.findMany({
      where,
      orderBy: {
        scheduledFor: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Parse metadata for each notification
    const notificationsWithMetadata = notifications.map(notification => ({
      ...notification,
      metadata: notification.metadata ? JSON.parse(notification.metadata) : null,
      messagePreview: notification.message ? 
        notification.message.substring(0, 100) + (notification.message.length > 100 ? '...' : '') : 
        'No message content'
    }))

    // Get statistics
    const stats = await getNotificationStats(where)

    return NextResponse.json({
      notifications: notificationsWithMetadata,
      stats,
      pagination: {
        limit,
        offset,
        total: await db.scheduledNotification.count({ where })
      }
    })
  } catch (error) {
    console.error('Error fetching notification history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification history' },
      { status: 500 }
    )
  }
}

async function getNotificationStats(where: any) {
  try {
    const [
      totalNotifications,
      sentNotifications,
      pendingNotifications,
      failedNotifications
    ] = await Promise.all([
      db.scheduledNotification.count({ where }),
      db.scheduledNotification.count({
        where: { ...where, sent: true }
      }),
      db.scheduledNotification.count({
        where: { ...where, sent: false }
      }),
      db.scheduledNotification.count({
        where: { ...where, sent: false, scheduledFor: { lt: new Date() } }
      })
    ])

    // Get notifications by type
    const notificationsByType = await db.scheduledNotification.groupBy({
      by: ['type'],
      where,
      _count: {
        type: true
      },
      orderBy: {
        _count: {
          type: 'desc'
        }
      }
    })

    // Get recent notifications (last 7 days)
    const recentNotifications = await db.scheduledNotification.count({
      where: {
        ...where,
        scheduledFor: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    })

    return {
      totalNotifications,
      sentNotifications,
      pendingNotifications,
      failedNotifications,
      notificationsByType,
      recentNotifications,
      successRate: totalNotifications > 0 ? (sentNotifications / totalNotifications * 100).toFixed(1) : '0'
    }
  } catch (error) {
    console.error('Error getting notification stats:', error)
    return {
      totalNotifications: 0,
      sentNotifications: 0,
      pendingNotifications: 0,
      failedNotifications: 0,
      notificationsByType: [],
      recentNotifications: 0,
      successRate: '0'
    }
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN'])
  if (!auth.user) return auth.response
  try {
    const { action, data } = await request.json()

    if (action === 'resend_notification') {
      const { notificationId } = data
      
      const notification = await db.scheduledNotification.findUnique({
        where: { id: notificationId }
      })

      if (!notification) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        )
      }

      // Resend the notification
      const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1422903085680033853/mVeuOQhZk7ocLABZG1fTPcNWf4I5rx98gvRYkjSPZx27rzgkdQamXJIPOW7fJLV5nCPF'
      
      const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: notification.message,
          username: 'NavGurukul Kitchen Bot (Resent)',
          avatar_url: 'https://cdn-icons-png.flaticon.com/512/3774/3774290.png'
        })
      })

      if (!response.ok) {
        throw new Error(`Discord API error: ${response.statusText}`)
      }

      // Update notification status
      await db.scheduledNotification.update({
        where: { id: notificationId },
        data: {
          sent: true,
          sentAt: new Date()
        }
      })

      // Log the resend
      await db.historyLog.create({
        data: {
          action: 'NOTIFICATION_RESENT',
          updatedBy: 'SYSTEM',
          metadata: JSON.stringify({
            originalNotificationId: notificationId,
            resentAt: new Date().toISOString(),
            originalScheduledFor: notification.scheduledFor
          })
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Notification resent successfully'
      })
    }

    if (action === 'mark_failed') {
      const { notificationId, reason } = data
      
      await db.scheduledNotification.update({
        where: { id: notificationId },
        data: {
          sent: false,
          metadata: JSON.stringify({
            ...JSON.parse('{}'), // existing metadata
            failureReason: reason,
            failedAt: new Date().toISOString()
          })
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Notification marked as failed'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in notification history POST:', error)
    return NextResponse.json(
      { error: 'Failed to process notification request' },
      { status: 500 }
    )
  }
}