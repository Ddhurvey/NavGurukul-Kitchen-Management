import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let where: any = {}
    
    // Filter by date range if provided
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = new Date(startDate)
      if (endDate) where.timestamp.lte = new Date(endDate)
    }

    // Filter by action type
    if (type !== 'all') {
      where.action = {
        in: getActionTypes(type)
      }
    }

    const history = await db.historyLog.findMany({
      where,
      include: {
        updatedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Get counts for different types
    const counts = await getHistoryCounts(where)

    return NextResponse.json({
      history,
      counts,
      pagination: {
        limit,
        offset,
        total: await db.historyLog.count({ where })
      }
    })
  } catch (error) {
    console.error('Error fetching history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, updatedBy, metadata } = await request.json()

    const historyLog = await db.historyLog.create({
      data: {
        action,
        updatedBy,
        metadata: metadata ? JSON.stringify(metadata) : null
      },
      include: {
        updatedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      historyLog
    })
  } catch (error) {
    console.error('Error creating history log:', error)
    return NextResponse.json(
      { error: 'Failed to create history log' },
      { status: 500 }
    )
  }
}

function getActionTypes(type: string): string[] {
  const typeMap: Record<string, string[]> = {
    'assignments': [
      'ROUND_ROBIN_ASSIGNMENT',
      'SUNDAY_SPECIAL_ASSIGNMENT',
      'SUNDAY_EGG_RULE_ASSIGNMENT',
      'KITCHEN_TURN_UPDATED',
      'EMERGENCY_REASSIGNMENT',
      'IMMEDIATE_REASSIGNMENT_APPROVED_LEAVE'
    ],
    'leaves': [
      'LEAVE_REQUEST_CREATED',
      'EMERGENCY_LEAVE_CREATED',
      'LEAVE_APPROVED',
      'LEAVE_REJECTED'
    ],
    'swaps': [
      'SWAP_REQUEST_CREATED',
      'SWAP_APPROVED',
      'SWAP_EXECUTED',
      'SWAP_REJECTED'
    ],
    'notifications': [
      'DAILY_DISCORD_NOTIFICATION_SENT',
      'DAILY_9PM_SCHEDULER_RUN',
      'SUNDAY_9AM_SPECIAL_SCHEDULER_RUN',
      'DAILY_9PM_SCHEDULER_SKIP_SUNDAY',
      'EMERGENCY_NOTIFICATION_SENT',
      'NOTIFICATION_RESENT'
    ],
    'system': [
      'DAILY_9PM_SCHEDULER_ERROR',
      'SUNDAY_9AM_SCHEDULER_ERROR',
      'SYSTEM_ERROR',
      'AUTO_ASSIGNMENT'
    ],
    'cycles': [
      'CYCLE_STARTED',
      'CYCLE_COMPLETED',
      'ROTATION_UPDATED'
    ]
  }

  return typeMap[type] || []
}

async function getHistoryCounts(where: any) {
  const [
    totalAssignments,
    totalLeaves,
    totalSwaps,
    totalNotifications,
    totalSystem,
    totalCycles
  ] = await Promise.all([
    db.historyLog.count({
      where: {
        ...where,
        action: { in: getActionTypes('assignments') }
      }
    }),
    db.historyLog.count({
      where: {
        ...where,
        action: { in: getActionTypes('leaves') }
      }
    }),
    db.historyLog.count({
      where: {
        ...where,
        action: { in: getActionTypes('swaps') }
      }
    }),
    db.historyLog.count({
      where: {
        ...where,
        action: { in: getActionTypes('notifications') }
      }
    }),
    db.historyLog.count({
      where: {
        ...where,
        action: { in: getActionTypes('system') }
      }
    }),
    db.historyLog.count({
      where: {
        ...where,
        action: { in: getActionTypes('cycles') }
      }
    })
  ])

  return {
    totalAssignments,
    totalLeaves,
    totalSwaps,
    totalNotifications,
    totalSystem,
    totalCycles
  }
}