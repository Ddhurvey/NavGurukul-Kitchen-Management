import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getIndiaToday } from '@/lib/time'
import { requireRole } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN'])
  if (!auth.user) return auth.response
  try {

    console.log('🔄 Starting database reset...')

    // Step 1: Clear all kitchen-related tables
    await db.kitchenTurnStudent.deleteMany({})
    console.log('✅ Cleared kitchen turn assignments')
    
    await db.kitchenTurn.deleteMany({})
    console.log('✅ Cleared kitchen turns')
    
    await db.foodMenu.deleteMany({})
    console.log('✅ Cleared food menus')
    
    await db.swapRequest.deleteMany({})
    console.log('✅ Cleared swap requests')
    
    await db.scheduledNotification.deleteMany({})
    console.log('✅ Cleared scheduled notifications')
    
    await db.leave.deleteMany({})
    console.log('✅ Cleared leave requests')
    
    await db.rotationCycle.deleteMany({})
    console.log('✅ Cleared rotation cycles')
    
    await db.rotationCycleStudent.deleteMany({})
    console.log('✅ Cleared rotation cycle students')
    
    await db.historyLog.deleteMany({})
    console.log('✅ Cleared history logs')

    // Step 2: Reset user counters and rotation data
    await db.user.updateMany({
      data: {
        totalKitchenTurns: 0,
        leaveDays: 0,
        rotationPosition: 0,
        lastTurnDate: null,
        updatedAt: new Date()
      }
    })
    console.log('✅ Reset user duty counters and rotation data')

    // Step 3: Create initial rotation cycle
    const today = getIndiaToday()
    const initialCycle = await db.rotationCycle.create({
      data: {
        cycleNumber: 1,
        startDate: today,
        totalDays: 7,
        isActive: true
      }
    })
    console.log('✅ Created initial rotation cycle')

    // Step 4: Initialize rotation positions for all active students
    const activeStudents = await db.user.findMany({
      where: {
        status: 'ACTIVE',
        role: 'STUDENT'
      },
      orderBy: { createdAt: 'asc' }
    })

    if (activeStudents.length > 0) {
      // Update rotation positions based on registration order
      await Promise.all(
        activeStudents.map((student, index) =>
          db.user.update({
            where: { id: student.id },
            data: { rotationPosition: index }
          })
        )
      )

      // Add students to initial rotation cycle
      await db.rotationCycleStudent.createMany({
        data: activeStudents.map((student, index) => ({
          cycleId: initialCycle.id,
          studentId: student.id,
          position: index,
          turnsCompleted: 0,
          lastAssignedDate: null
        }))
      })
      console.log(`✅ Initialized rotation for ${activeStudents.length} active students`)

      // Step 5: Assign first duty to the first registered user
      const firstUser = activeStudents[0]
      await assignFirstDuty(firstUser, today, initialCycle.id)
      console.log(`✅ Assigned first duty to ${firstUser.name}`)
    }

    // Step 6: Log the reset
    if (activeStudents.length > 0) {
      await db.historyLog.create({
        data: {
          action: 'SYSTEM_RESET',
          updatedBy: activeStudents[0].id, // Use first active user as updater
          metadata: JSON.stringify({
            resetTime: new Date().toISOString(),
            activeUsersCount: activeStudents.length,
            initialCycleId: initialCycle.id,
            firstAssignedUser: activeStudents[0]?.name || null
          })
        }
      })
    }

    console.log('🎉 Database reset completed successfully!')

    return NextResponse.json({
      success: true,
      message: 'Database reset completed successfully',
      data: {
        activeUsersCount: activeStudents.length,
        initialCycleId: initialCycle.id,
        firstAssignedUser: activeStudents[0]?.name || null,
        resetTime: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Error during database reset:', error)
    return NextResponse.json(
      { error: 'Failed to reset database' },
      { status: 500 }
    )
  }
}

async function assignFirstDuty(user: any, date: Date, cycleId: string) {
  // Create kitchen turn for the first user
  const kitchenTurn = await db.kitchenTurn.create({
    data: {
      date,
      status: 'PENDING',
      teamLeaderId: user.id,
      cycleId,
      menuBasedAssignment: false,
      isLocked: false
    }
  })

  // Assign the user to the kitchen turn
  await db.kitchenTurnStudent.create({
    data: {
      kitchenTurnId: kitchenTurn.id,
      studentId: user.id
    }
  })

  // Update user's first duty info
  await db.user.update({
    where: { id: user.id },
    data: {
      totalKitchenTurns: 1,
      lastTurnDate: date
    }
  })

  // Update rotation cycle student
  await db.rotationCycleStudent.update({
    where: {
      cycleId_studentId: {
        cycleId,
        studentId: user.id
      }
    },
    data: {
      turnsCompleted: 1,
      lastAssignedDate: date
    }
  })

  // Create default food menu for today
  await db.foodMenu.create({
    data: {
      date,
      breakfast: 'Poha',
      lunch: 'Dal + Rice',
      snacks: 'Samosa',
      dinner: 'Veg + Roti',
      updatedBy: user.id
    }
  })

  return kitchenTurn
}

// GET endpoint to check reset status
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN'])
  if (!auth.user) return auth.response
  try {
    const stats = await Promise.all([
      db.kitchenTurn.count(),
      db.foodMenu.count(),
      db.swapRequest.count(),
      db.scheduledNotification.count(),
      db.leave.count(),
      db.rotationCycle.count(),
      db.historyLog.count(),
      db.user.count({
        where: { status: 'ACTIVE', role: 'STUDENT' }
      })
    ])

    const [kitchenTurns, foodMenus, swapRequests, notifications, leaves, cycles, historyLogs, activeStudents] = stats

    return NextResponse.json({
      systemStatus: {
        kitchenTurns,
        foodMenus,
        swapRequests,
        notifications,
        leaves,
        cycles,
        historyLogs,
        activeStudents
      },
      canReset: activeStudents > 0
    })
  } catch (error) {
    console.error('Error checking reset status:', error)
    return NextResponse.json(
      { error: 'Failed to check system status' },
      { status: 500 }
    )
  }
}