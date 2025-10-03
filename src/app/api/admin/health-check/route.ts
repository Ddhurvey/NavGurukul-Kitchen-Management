import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getIndiaToday, isIndiaPast9PM } from '@/lib/time'

export async function GET() {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {} as any,
      summary: {
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 0
      }
    }

    // Check 1: Database Connection
    try {
      await db.user.findFirst()
      healthStatus.checks.database = {
        status: 'pass',
        message: 'Database connection successful'
      }
      healthStatus.summary.passedChecks++
    } catch (error) {
      healthStatus.checks.database = {
        status: 'fail',
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      healthStatus.summary.failedChecks++
      healthStatus.status = 'unhealthy'
    }
    healthStatus.summary.totalChecks++

    // Check 2: Active Users
    try {
      const activeUsersCount = await db.user.count({
        where: {
          status: 'ACTIVE',
          role: 'STUDENT'
        }
      })
      
      healthStatus.checks.activeUsers = {
        status: activeUsersCount > 0 ? 'pass' : 'warn',
        count: activeUsersCount,
        message: activeUsersCount > 0 
          ? `Found ${activeUsersCount} active students` 
          : 'No active students found'
      }
      
      if (activeUsersCount > 0) {
        healthStatus.summary.passedChecks++
      } else {
        healthStatus.summary.failedChecks++
        healthStatus.status = 'degraded'
      }
    } catch (error) {
      healthStatus.checks.activeUsers = {
        status: 'fail',
        message: 'Failed to count active users',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      healthStatus.summary.failedChecks++
      healthStatus.status = 'unhealthy'
    }
    healthStatus.summary.totalChecks++

    // Check 3: Rotation System
    try {
      const activeCycle = await db.rotationCycle.findFirst({
        where: { isActive: true },
        include: {
          students: {
            include: { student: true }
          }
        }
      })
      
      if (activeCycle) {
        healthStatus.checks.rotation = {
          status: 'pass',
          cycleId: activeCycle.id,
          cycleNumber: activeCycle.cycleNumber,
          studentsCount: activeCycle.students.length,
          message: `Rotation cycle ${activeCycle.cycleNumber} active with ${activeCycle.students.length} students`
        }
        healthStatus.summary.passedChecks++
      } else {
        healthStatus.checks.rotation = {
          status: 'warn',
          message: 'No active rotation cycle found'
        }
        healthStatus.summary.failedChecks++
        healthStatus.status = 'degraded'
      }
    } catch (error) {
      healthStatus.checks.rotation = {
        status: 'fail',
        message: 'Failed to check rotation system',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      healthStatus.summary.failedChecks++
      healthStatus.status = 'unhealthy'
    }
    healthStatus.summary.totalChecks++

    // Check 4: Today's Kitchen Assignment
    try {
      const today = getIndiaToday()
      const todayTurn = await db.kitchenTurn.findUnique({
        where: { date: today },
        include: {
          assignedStudents: {
            include: { student: true }
          },
          teamLeader: true
        }
      })
      
      if (todayTurn) {
        healthStatus.checks.todayAssignment = {
          status: 'pass',
          turnId: todayTurn.id,
          status: todayTurn.status,
          assignedCount: todayTurn.assignedStudents.length,
          teamLeader: todayTurn.teamLeader?.name || 'Not assigned',
          isLocked: todayTurn.isLocked,
          message: `Today's kitchen assigned to ${todayTurn.assignedStudents.length} students`
        }
        healthStatus.summary.passedChecks++
      } else {
        healthStatus.checks.todayAssignment = {
          status: 'warn',
          message: 'No kitchen assignment found for today'
        }
        healthStatus.summary.failedChecks++
        healthStatus.status = 'degraded'
      }
    } catch (error) {
      healthStatus.checks.todayAssignment = {
        status: 'fail',
        message: 'Failed to check today\'s assignment',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      healthStatus.summary.failedChecks++
      healthStatus.status = 'unhealthy'
    }
    healthStatus.summary.totalChecks++

    // Check 5: Today's Food Menu
    try {
      const today = getIndiaToday()
      const todayMenu = await db.foodMenu.findUnique({
        where: { date: today },
        include: {
          updatedByUser: {
            select: { name: true }
          }
        }
      })
      
      if (todayMenu) {
        healthStatus.checks.todayMenu = {
          status: 'pass',
          menuId: todayMenu.id,
          hasBreakfast: !!todayMenu.breakfast,
          hasLunch: !!todayMenu.lunch,
          hasSnacks: !!todayMenu.snacks,
          hasDinner: !!todayMenu.dinner,
          updatedBy: todayMenu.updatedByUser?.name || 'Unknown',
          isLocked: todayMenu.isLocked,
          message: 'Today\'s food menu is available'
        }
        healthStatus.summary.passedChecks++
      } else {
        healthStatus.checks.todayMenu = {
          status: 'warn',
          message: 'No food menu found for today'
        }
        healthStatus.summary.failedChecks++
        healthStatus.status = 'degraded'
      }
    } catch (error) {
      healthStatus.checks.todayMenu = {
        status: 'fail',
        message: 'Failed to check today\'s food menu',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      healthStatus.summary.failedChecks++
      healthStatus.status = 'unhealthy'
    }
    healthStatus.summary.totalChecks++

    // Check 6: Scheduled Notifications
    try {
      const pendingNotifications = await db.scheduledNotification.count({
        where: { sent: false }
      })
      
      const upcomingNotifications = await db.scheduledNotification.findMany({
        where: { 
          sent: false,
          scheduledFor: {
            gte: new Date()
          }
        },
        orderBy: { scheduledFor: 'asc' },
        take: 3
      })
      
      healthStatus.checks.notifications = {
        status: 'pass',
        pendingCount: pendingNotifications,
        upcomingCount: upcomingNotifications.length,
        nextNotification: upcomingNotifications[0]?.scheduledFor || null,
        message: `${pendingNotifications} pending notifications scheduled`
      }
      healthStatus.summary.passedChecks++
    } catch (error) {
      healthStatus.checks.notifications = {
        status: 'fail',
        message: 'Failed to check notifications',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      healthStatus.summary.failedChecks++
      healthStatus.status = 'unhealthy'
    }
    healthStatus.summary.totalChecks++

    // Check 7: Time-based Rules
    try {
      const indiaTime = new Date(new Date().getTime() + (5.5 * 3600000))
      const isPast9PM = isIndiaPast9PM()
      const currentHour = indiaTime.getHours()
      
      healthStatus.checks.timeRules = {
        status: 'pass',
        indiaTime: indiaTime.toISOString(),
        currentHour,
        isPast9PM,
        message: `India time: ${indiaTime.toLocaleTimeString()}, 9PM rule: ${isPast9PM ? 'Active' : 'Inactive'}`
      }
      healthStatus.summary.passedChecks++
    } catch (error) {
      healthStatus.checks.timeRules = {
        status: 'fail',
        message: 'Failed to check time rules',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      healthStatus.summary.failedChecks++
      healthStatus.status = 'unhealthy'
    }
    healthStatus.summary.totalChecks++

    // Check 8: Data Integrity
    try {
      // Check for orphaned records
      const orphanedTurnStudents = await db.kitchenTurnStudent.count({
        where: {
          kitchenTurn: null
        }
      })
      
      const orphanedCycleStudents = await db.rotationCycleStudent.count({
        where: {
          cycle: null
        }
      })
      
      if (orphanedTurnStudents === 0 && orphanedCycleStudents === 0) {
        healthStatus.checks.dataIntegrity = {
          status: 'pass',
          orphanedTurnStudents,
          orphanedCycleStudents,
          message: 'No orphaned records found'
        }
        healthStatus.summary.passedChecks++
      } else {
        healthStatus.checks.dataIntegrity = {
          status: 'warn',
          orphanedTurnStudents,
          orphanedCycleStudents,
          message: `Found ${orphanedTurnStudents + orphanedCycleStudents} orphaned records`
        }
        healthStatus.summary.failedChecks++
        healthStatus.status = 'degraded'
      }
    } catch (error) {
      healthStatus.checks.dataIntegrity = {
        status: 'fail',
        message: 'Failed to check data integrity',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      healthStatus.summary.failedChecks++
      healthStatus.status = 'unhealthy'
    }
    healthStatus.summary.totalChecks++

    // Determine overall health
    if (healthStatus.summary.failedChecks === 0) {
      healthStatus.status = 'healthy'
    } else if (healthStatus.summary.failedChecks <= 2) {
      healthStatus.status = 'degraded'
    } else {
      healthStatus.status = 'unhealthy'
    }

    return NextResponse.json(healthStatus)

  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed to run',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST endpoint to run specific health checks
export async function POST(request: NextRequest) {
  try {
    const { checks } = await request.json()
    
    if (!checks || !Array.isArray(checks)) {
      return NextResponse.json(
        { error: 'Invalid checks array provided' },
        { status: 400 }
      )
    }

    const results = {}
    
    for (const checkName of checks) {
      switch (checkName) {
        case 'database':
          try {
            await db.user.findFirst()
            results[checkName] = { status: 'pass' }
          } catch (error) {
            results[checkName] = { 
              status: 'fail', 
              error: error instanceof Error ? error.message : 'Unknown error' 
            }
          }
          break
          
        case 'rotation':
          try {
            const activeCycle = await db.rotationCycle.findFirst({
              where: { isActive: true }
            })
            results[checkName] = { 
              status: activeCycle ? 'pass' : 'warn',
              hasActiveCycle: !!activeCycle
            }
          } catch (error) {
            results[checkName] = { 
              status: 'fail', 
              error: error instanceof Error ? error.message : 'Unknown error' 
            }
          }
          break
          
        default:
          results[checkName] = { 
            status: 'unknown', 
            message: 'Unknown check type' 
          }
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      results
    })

  } catch (error) {
    console.error('Specific health check failed:', error)
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        error: 'Specific health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}