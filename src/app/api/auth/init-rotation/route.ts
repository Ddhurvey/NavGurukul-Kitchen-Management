import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getIndiaToday } from '@/lib/time'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get the user
    const user = await db.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is a student
    if (user.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Only students can be part of kitchen rotation' },
        { status: 400 }
      )
    }

    // Get count of active students
    const activeStudentsCount = await db.user.count({
      where: {
        status: 'ACTIVE',
        role: 'STUDENT'
      }
    })

    // Check if this is the first active user
    const isFirstUser = activeStudentsCount === 1

    // Check if rotation system is already initialized
    const existingCycle = await db.rotationCycle.findFirst({
      where: { isActive: true }
    })

    if (existingCycle) {
      // Rotation already exists, just ensure user is part of it
      await ensureUserInRotation(user, existingCycle.id)
      
      return NextResponse.json({
        success: true,
        message: 'User added to existing rotation',
        isFirstUser: false,
        cycleId: existingCycle.id,
        userPosition: user.rotationPosition
      })
    }

    // This is the first user - initialize the rotation system
    if (isFirstUser) {
      const today = getIndiaToday()
      
      // Create initial rotation cycle
      const initialCycle = await db.rotationCycle.create({
        data: {
          cycleNumber: 1,
          startDate: today,
          totalDays: 7,
          isActive: true
        }
      })

      // Initialize user's rotation position
      await db.user.update({
        where: { id: user.id },
        data: {
          rotationPosition: 0,
          totalKitchenTurns: 0,
          lastTurnDate: null
        }
      })

      // Add user to rotation cycle
      await db.rotationCycleStudent.create({
        data: {
          cycleId: initialCycle.id,
          studentId: user.id,
          position: 0,
          turnsCompleted: 0,
          lastAssignedDate: null
        }
      })

      // Assign first duty to this user
      await assignFirstDuty(user, today, initialCycle.id)

      // Schedule initial notifications
      await scheduleInitialNotifications()

      // Log the initialization
      await db.historyLog.create({
        data: {
          action: 'ROTATION_INITIALIZED',
          updatedBy: user.id,
          metadata: JSON.stringify({
            firstUserId: user.id,
            firstUserName: user.name,
            cycleId: initialCycle.id,
            initializationTime: new Date().toISOString()
          })
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Rotation system initialized with first user',
        isFirstUser: true,
        cycleId: initialCycle.id,
        userPosition: 0,
        firstDutyAssigned: true
      })
    }

    // Multiple users exist but no rotation - this shouldn't happen, but handle it
    const today = getIndiaToday()
    const allActiveStudents = await db.user.findMany({
      where: {
        status: 'ACTIVE',
        role: 'STUDENT'
      },
      orderBy: { createdAt: 'asc' }
    })

    // Create rotation cycle for all existing users
    const recoveryCycle = await db.rotationCycle.create({
      data: {
        cycleNumber: 1,
        startDate: today,
        totalDays: 7,
        isActive: true
      }
    })

    // Initialize all users in rotation
    await Promise.all(
      allActiveStudents.map((student, index) =>
        db.user.update({
          where: { id: student.id },
          data: { rotationPosition: index }
        })
      )
    )

    // Add all users to rotation cycle
    await db.rotationCycleStudent.createMany({
      data: allActiveStudents.map((student, index) => ({
        cycleId: recoveryCycle.id,
        studentId: student.id,
        position: index,
        turnsCompleted: 0,
        lastAssignedDate: null
      }))
    })

    // Assign duty to first user
    await assignFirstDuty(allActiveStudents[0], today, recoveryCycle.id)

    return NextResponse.json({
      success: true,
      message: 'Rotation system recovered with existing users',
      isFirstUser: false,
      cycleId: recoveryCycle.id,
      totalUsers: allActiveStudents.length,
      userPosition: user.rotationPosition
    })

  } catch (error) {
    console.error('Error initializing rotation:', error)
    return NextResponse.json(
      { error: 'Failed to initialize rotation' },
      { status: 500 }
    )
  }
}

async function ensureUserInRotation(user: any, cycleId: string) {
  // Check if user is already in the rotation cycle
  const existingCycleStudent = await db.rotationCycleStudent.findUnique({
    where: {
      cycleId_studentId: {
        cycleId,
        studentId: user.id
      }
    }
  })

  if (!existingCycleStudent) {
    // Get current max position in cycle
    const maxPosition = await db.rotationCycleStudent.findFirst({
      where: { cycleId },
      orderBy: { position: 'desc' }
    })

    const newPosition = (maxPosition?.position || -1) + 1

    // Add user to existing cycle
    await db.rotationCycleStudent.create({
      data: {
        cycleId,
        studentId: user.id,
        position: newPosition,
        turnsCompleted: 0,
        lastAssignedDate: null
      }
    })

    // Update user's rotation position
    await db.user.update({
      where: { id: user.id },
      data: { rotationPosition: newPosition }
    })
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

async function scheduleInitialNotifications() {
  const tomorrow = getIndiaToday()
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Schedule tomorrow's 9 PM notification
  const ninePMTomorrow = new Date(tomorrow)
  ninePMTomorrow.setHours(21, 0, 0, 0)

  await db.scheduledNotification.create({
    data: {
      type: 'DAILY_KITCHEN_ASSIGNMENT',
      scheduledFor: ninePMTomorrow,
      sent: false,
      message: 'Pending: Daily kitchen assignment notification',
      metadata: JSON.stringify({
        scheduledDate: ninePMTomorrow.toISOString(),
        type: 'DAILY_9PM_SCHEDULER'
      })
    }
  })

  // Check if tomorrow is Sunday and schedule Sunday special notification
  const tomorrowDay = new Date(tomorrow.getTime() + (5.5 * 3600000)).getDay()
  if (tomorrowDay === 0) { // Sunday
    const nineAMSaturday = new Date(tomorrow)
    nineAMSaturday.setDate(nineAMSaturday.getDate() - 1) // Go to Saturday
    nineAMSaturday.setHours(9, 0, 0, 0)

    await db.scheduledNotification.create({
      data: {
        type: 'SUNDAY_SPECIAL_ASSIGNMENT',
        scheduledFor: nineAMSaturday,
        sent: false,
        message: 'Pending: Sunday special assignment notification',
        metadata: JSON.stringify({
          scheduledDate: nineAMSaturday.toISOString(),
          type: 'SUNDAY_9AM_SCHEDULER'
        })
      }
    })
  }
}

// GET endpoint to check rotation status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const activeCycle = await db.rotationCycle.findFirst({
      where: { isActive: true },
      include: {
        students: {
          include: {
            student: true
          },
          orderBy: { position: 'asc' }
        }
      }
    })

    const activeStudentsCount = await db.user.count({
      where: {
        status: 'ACTIVE',
        role: 'STUDENT'
      }
    })

    let userStatus = null
    if (userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: {
          rotationCycles: {
            where: { cycle: { isActive: true } },
            include: { cycle: true }
          }
        }
      })
      
      if (user) {
        userStatus = {
          id: user.id,
          name: user.name,
          rotationPosition: user.rotationPosition,
          totalKitchenTurns: user.totalKitchenTurns,
          isInRotation: user.rotationCycles.length > 0
        }
      }
    }

    return NextResponse.json({
      rotationInitialized: !!activeCycle,
      activeStudentsCount,
      isFirstUser: activeStudentsCount === 1,
      cycle: activeCycle ? {
        id: activeCycle.id,
        cycleNumber: activeCycle.cycleNumber,
        startDate: activeCycle.startDate,
        totalStudents: activeCycle.students.length
      } : null,
      userStatus
    })
  } catch (error) {
    console.error('Error checking rotation status:', error)
    return NextResponse.json(
      { error: 'Failed to check rotation status' },
      { status: 500 }
    )
  }
}