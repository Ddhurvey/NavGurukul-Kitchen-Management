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

    // Get the current user
    const currentUser = await db.user.findUnique({
      where: { id: userId }
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is a student
    if (currentUser.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Only students can be part of kitchen rotation' },
        { status: 400 }
      )
    }

    // Get all active students
    const allActiveStudents = await db.user.findMany({
      where: {
        status: 'ACTIVE',
        role: 'STUDENT'
      },
      orderBy: { createdAt: 'asc' }
    })

    // Check if there are multiple students registered on the same day
    const today = getIndiaToday()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const sameDayRegistrations = allActiveStudents.filter(student => {
      const studentCreatedDate = new Date(student.createdAt)
      studentCreatedDate.setHours(0, 0, 0, 0)
      return studentCreatedDate.getTime() === today.getTime()
    })

    // Get or create active rotation cycle
    let activeCycle = await db.rotationCycle.findFirst({
      where: { isActive: true },
      include: {
        students: {
          include: { student: true },
          orderBy: { position: 'asc' }
        }
      }
    })

    if (!activeCycle) {
      // No cycle exists, create one
      activeCycle = await createInitialCycle(allActiveStudents)
    } else {
      // Cycle exists, ensure all students are properly positioned
      await ensureAllStudentsInCycle(allActiveStudents, activeCycle.id)
    }

    // Handle same-day registration logic
    if (sameDayRegistrations.length > 1) {
      await handleSameDayRegistrations(sameDayRegistrations, activeCycle.id)
    }

    // Ensure current user is properly positioned
    await ensureUserInRotation(currentUser, activeCycle.id)

    // Get updated user data
    const updatedUser = await db.user.findUnique({
      where: { id: userId },
      include: {
        rotationCycles: {
          where: { cycle: { isActive: true } },
          include: { cycle: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Multiple registrations handled successfully',
      data: {
        totalActiveStudents: allActiveStudents.length,
        sameDayRegistrations: sameDayRegistrations.length,
        userPosition: updatedUser?.rotationPosition,
        cycleId: activeCycle.id,
        handledSameDayLogic: sameDayRegistrations.length > 1
      }
    })

  } catch (error) {
    console.error('Error handling multiple registrations:', error)
    return NextResponse.json(
      { error: 'Failed to handle multiple registrations' },
      { status: 500 }
    )
  }
}

async function createInitialCycle(students: any[]) {
  const today = getIndiaToday()
  
  const initialCycle = await db.rotationCycle.create({
    data: {
      cycleNumber: 1,
      startDate: today,
      totalDays: 7,
      isActive: true
    }
  })

  // Initialize all students in rotation based on creation time
  await Promise.all(
    students.map((student, index) =>
      db.user.update({
        where: { id: student.id },
        data: { rotationPosition: index }
      })
    )
  )

  // Add all students to rotation cycle
  await db.rotationCycleStudent.createMany({
    data: students.map((student, index) => ({
      cycleId: initialCycle.id,
      studentId: student.id,
      position: index,
      turnsCompleted: 0,
      lastAssignedDate: null
    }))
  })

  // Assign first duty to the first registered student
  if (students.length > 0) {
    await assignFirstDuty(students[0], today, initialCycle.id)
  }

  return initialCycle
}

async function ensureAllStudentsInCycle(students: any[], cycleId: string) {
  for (const student of students) {
    await ensureUserInRotation(student, cycleId)
  }
}

async function ensureUserInRotation(user: any, cycleId: string) {
  const existingCycleStudent = await db.rotationCycleStudent.findUnique({
    where: {
      cycleId_studentId: {
        cycleId,
        studentId: user.id
      }
    }
  })

  if (!existingCycleStudent) {
    const maxPosition = await db.rotationCycleStudent.findFirst({
      where: { cycleId },
      orderBy: { position: 'desc' }
    })

    const newPosition = (maxPosition?.position || -1) + 1

    await db.rotationCycleStudent.create({
      data: {
        cycleId,
        studentId: user.id,
        position: newPosition,
        turnsCompleted: 0,
        lastAssignedDate: null
      }
    })

    await db.user.update({
      where: { id: user.id },
      data: { rotationPosition: newPosition }
    })
  }
}

async function handleSameDayRegistrations(sameDayStudents: any[], cycleId: string) {
  console.log(`🔄 Handling ${sameDayStudents.length} same-day registrations`)

  // Sort by exact creation time to maintain order
  sameDayStudents.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  // Get current max position in cycle
  const maxPosition = await db.rotationCycleStudent.findFirst({
    where: { cycleId },
    orderBy: { position: 'desc' }
  })

  let nextPosition = (maxPosition?.position || -1) + 1

  // Update positions for same-day students
  for (let i = 0; i < sameDayStudents.length; i++) {
    const student = sameDayStudents[i]
    
    await db.user.update({
      where: { id: student.id },
      data: { rotationPosition: nextPosition + i }
    })

    await db.rotationCycleStudent.upsert({
      where: {
        cycleId_studentId: {
          cycleId,
          studentId: student.id
        }
      },
      update: {
        position: nextPosition + i
      },
      create: {
        cycleId,
        studentId: student.id,
        position: nextPosition + i,
        turnsCompleted: 0,
        lastAssignedDate: null
      }
    })
  }

  // Log the same-day registration handling
  await db.historyLog.create({
    data: {
      action: 'SAME_DAY_REGISTRATION_HANDLED',
      updatedBy: 'SYSTEM',
      metadata: JSON.stringify({
        handledDate: new Date().toISOString(),
        sameDayStudents: sameDayStudents.map(s => ({
          id: s.id,
          name: s.name,
          createdAt: s.createdAt
        })),
        assignedPositions: sameDayStudents.map((s, i) => ({
          studentId: s.id,
          position: nextPosition + i
        }))
      })
    }
  })

  console.log(`✅ Assigned positions ${nextPosition} to ${nextPosition + sameDayStudents.length - 1} for same-day registrations`)
}

async function assignFirstDuty(user: any, date: Date, cycleId: string) {
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

  await db.kitchenTurnStudent.create({
    data: {
      kitchenTurnId: kitchenTurn.id,
      studentId: user.id
    }
  })

  await db.user.update({
    where: { id: user.id },
    data: {
      totalKitchenTurns: 1,
      lastTurnDate: date
    }
  })

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

  await db.foodMenu.create({
    data: {
      date,
      breakfast: 'Poha',
      lunch: 'Dal + Rice',
      snacks: 'Samosa',
      dinner: 'Veg + Roti',
      updatedBy: 'SYSTEM'
    }
  })

  return kitchenTurn
}

// GET endpoint to check registration status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const today = getIndiaToday()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get all active students
    const allActiveStudents = await db.user.findMany({
      where: {
        status: 'ACTIVE',
        role: 'STUDENT'
      },
      orderBy: { createdAt: 'asc' }
    })

    // Find same-day registrations
    const sameDayRegistrations = allActiveStudents.filter(student => {
      const studentCreatedDate = new Date(student.createdAt)
      studentCreatedDate.setHours(0, 0, 0, 0)
      return studentCreatedDate.getTime() === today.getTime()
    })

    let userStatus = null
    if (userId) {
      const user = allActiveStudents.find(s => s.id === userId)
      if (user) {
        userStatus = {
          id: user.id,
          name: user.name,
          rotationPosition: user.rotationPosition,
          totalKitchenTurns: user.totalKitchenTurns,
          createdAt: user.createdAt,
          isSameDayRegistration: sameDayRegistrations.some(s => s.id === user.id)
        }
      }
    }

    return NextResponse.json({
      totalActiveStudents: allActiveStudents.length,
      sameDayRegistrations: {
        count: sameDayRegistrations.length,
        students: sameDayRegistrations.map(s => ({
          id: s.id,
          name: s.name,
          createdAt: s.createdAt,
          rotationPosition: s.rotationPosition
        }))
      },
      userStatus,
      hasSameDayRegistrations: sameDayRegistrations.length > 1
    })
  } catch (error) {
    console.error('Error checking registration status:', error)
    return NextResponse.json(
      { error: 'Failed to check registration status' },
      { status: 500 }
    )
  }
}