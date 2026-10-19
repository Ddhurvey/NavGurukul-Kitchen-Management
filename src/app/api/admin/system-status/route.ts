import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getIndiaToday } from '@/lib/time'
import { requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN'])
  if (!auth.user) return auth.response
  try {
    const today = getIndiaToday()
    
    // Get comprehensive system statistics
    const [
      totalUsers,
      activeStudents,
      totalKitchenTurns,
      todayKitchenTurn,
      totalFoodMenus,
      todayFoodMenu,
      pendingSwapRequests,
      scheduledNotifications,
      activeRotationCycle,
      recentHistoryLogs
    ] = await Promise.all([
      // Total users
      db.user.count(),
      
      // Active students
      db.user.count({
        where: {
          status: 'ACTIVE',
          role: 'STUDENT'
        }
      }),
      
      // Total kitchen turns
      db.kitchenTurn.count(),
      
      // Today's kitchen turn
      db.kitchenTurn.findUnique({
        where: { date: today },
        include: {
          assignedStudents: {
            include: { student: true }
          },
          teamLeader: true
        }
      }),
      
      // Total food menus
      db.foodMenu.count(),
      
      // Today's food menu
      db.foodMenu.findUnique({
        where: { date: today }
      }),
      
      // Pending swap requests (safe)
      db.exchangeRequest.count({
        where: { status: 'PENDING' }
      }),
      
      // Scheduled notifications
      db.scheduledNotification.count({
        where: { sent: false }
      }),
      
      // Active rotation cycle
      db.rotationCycle.findFirst({
        where: { isActive: true },
        include: {
          students: {
            include: { student: true },
            orderBy: { position: 'asc' }
          }
        }
      }),
      
      // Recent history logs
      db.historyLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 10,
        include: {
          updatedByUser: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })
    ])

    // Calculate additional statistics
    const completedTurns = await db.kitchenTurn.count({
      where: { status: 'DONE' }
    })

    const pendingTurns = await db.kitchenTurn.count({
      where: { status: 'PENDING' }
    })

    // Get user statistics
    const userStats = await db.user.groupBy({
      by: ['status', 'role'],
      _count: true
    })

    // Get kitchen turn statistics by user
    const topPerformers = await db.user.findMany({
      where: {
        status: 'ACTIVE',
        role: 'STUDENT'
      },
      orderBy: {
        totalKitchenTurns: 'desc'
      },
      take: 5,
      select: {
        id: true,
        name: true,
        totalKitchenTurns: true,
        leaveDays: true,
        foodPreference: true
      }
    })

    // Check if system needs reset
    const needsReset = totalKitchenTurns === 0 && totalFoodMenus === 0 && activeStudents > 0
    
    // Check if rotation is initialized
    const rotationInitialized = !!activeRotationCycle
    
    // Check if today's assignments are ready
    const todayReady = !!todayKitchenTurn && !!todayFoodMenu

    return NextResponse.json({
      systemOverview: {
        totalUsers,
        activeStudents,
        rotationInitialized,
        todayReady,
        needsReset
      },
      kitchenStatus: {
        totalTurns: totalKitchenTurns,
        completedTurns,
        pendingTurns,
        todayAssignment: todayKitchenTurn ? {
          id: todayKitchenTurn.id,
          status: todayKitchenTurn.status,
          teamLeader: todayKitchenTurn.teamLeader?.name || 'Not assigned',
          assignedCount: todayKitchenTurn.assignedStudents.length,
          assignedStudents: todayKitchenTurn.assignedStudents.map(as => as.student.name)
        } : null
      },
      foodStatus: {
        totalMenus: totalFoodMenus,
        todayMenu: todayFoodMenu ? {
          id: todayFoodMenu.id,
          breakfast: todayFoodMenu.breakfast,
          lunch: todayFoodMenu.lunch,
          snacks: todayFoodMenu.snacks,
          dinner: todayFoodMenu.dinner,
          updatedBy: todayFoodMenu.updatedBy
        } : null
      },
      notifications: {
        pendingScheduled: scheduledNotifications,
        pendingSwaps: pendingSwapRequests
      },
      rotation: activeRotationCycle ? {
        id: activeRotationCycle.id,
        cycleNumber: activeRotationCycle.cycleNumber,
        startDate: activeRotationCycle.startDate,
        totalStudents: activeRotationCycle.students.length,
        students: activeRotationCycle.students.map(cs => ({
          position: cs.position,
          turnsCompleted: cs.turnsCompleted,
          student: {
            id: cs.student.id,
            name: cs.student.name,
            totalKitchenTurns: cs.student.totalKitchenTurns,
            foodPreference: cs.student.foodPreference
          }
        }))
      } : null,
      userStatistics: userStats,
      topPerformers,
      recentActivity: recentHistoryLogs.map(log => ({
        id: log.id,
        action: log.action,
        updatedAt: log.timestamp,
        user: log.updatedByUser?.name || 'System',
        metadata: log.metadata
      })),
      healthChecks: {
        database: 'OK',
        rotationSystem: rotationInitialized ? 'OK' : 'NOT_INITIALIZED',
        todayAssignments: todayReady ? 'OK' : 'NOT_READY',
        notifications: scheduledNotifications > 0 ? 'OK' : 'NONE_SCHEDULED'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching system status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN'])
  if (!auth.user) return auth.response
  try {
    const { action } = await request.json()

    let result = {}

    switch (action) {
      case 'quick_reset':
        // Quick reset: only clear today's data and reassign
        const today = getIndiaToday()
        
        // Clear today's assignments
        await db.kitchenTurnStudent.deleteMany({
          where: {
            kitchenTurn: { date: today }
          }
        })
        
        await db.kitchenTurn.deleteMany({
          where: { date: today }
        })
        
        await db.foodMenu.deleteMany({
          where: { date: today }
        })
        
        result = { message: 'Today\'s data cleared successfully' }
        break

      case 'full_reset':
        // Trigger full reset
        const resetResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/admin/reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', cookie: request.headers.get('cookie') || '' },
          body: JSON.stringify({})
        })
        
        if (resetResponse.ok) {
          result = await resetResponse.json()
        } else {
          throw new Error('Reset failed')
        }
        break

      case 'reset_notifications':
        // Reset notification system
        const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/admin/notifications/reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', cookie: request.headers.get('cookie') || '' },
          body: JSON.stringify({})
        })
        
        if (notificationResponse.ok) {
          result = await notificationResponse.json()
        } else {
          throw new Error('Notification reset failed')
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in admin action:', error)
    return NextResponse.json(
      { error: 'Failed to perform admin action' },
      { status: 500 }
    )
  }
}