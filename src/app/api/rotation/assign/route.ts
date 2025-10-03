import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { date, numberOfStudents = 3, force = false } = await request.json()
    
    // Use provided date or tomorrow
    const targetDate = date ? new Date(date) : new Date()
    if (!date) {
      targetDate.setDate(targetDate.getDate() + 1)
    }
    targetDate.setHours(0, 0, 0, 0)

    // Check if assignment already exists and is locked
    const existingAssignment = await db.kitchenTurn.findUnique({
      where: { date: targetDate },
      include: {
        assignedStudents: {
          include: {
            student: true
          }
        }
      }
    })

    if (existingAssignment && existingAssignment.isLocked && !force) {
      return NextResponse.json(
        { error: 'Kitchen assignment is locked after 9 PM' },
        { status: 400 }
      )
    }

    if (existingAssignment && !force) {
      return NextResponse.json(
        { error: 'Kitchen assignment already exists for this date' },
        { status: 400 }
      )
    }

    // Get active students (exclude FC, Team Members, and those on leave)
    const eligibleStudents = await db.user.findMany({
      where: {
        status: 'ACTIVE',
        role: 'STUDENT'
      },
      orderBy: {
        rotationPosition: 'asc'
      }
    })

    // Get students on leave on the target date
    const leavesOnTargetDate = await db.leave.findMany({
      where: {
        startDate: {
          lte: targetDate
        },
        endDate: {
          gte: targetDate
        },
        status: 'APPROVED'
      }
    })

    const leaveStudentIds = leavesOnTargetDate.map(leave => leave.studentId)
    const availableStudents = eligibleStudents.filter(
      student => !leaveStudentIds.includes(student.id)
    )

    if (availableStudents.length < numberOfStudents) {
      return NextResponse.json(
        { error: `Not enough available students. Need ${numberOfStudents}, only ${availableStudents.length} available` },
        { status: 400 }
      )
    }

    // Check if it's Sunday and apply special rule
    const isSunday = targetDate.getDay() === 0
    let selectedStudents = []

    if (isSunday) {
      selectedStudents = applySundaySpecialRule(availableStudents, numberOfStudents)
    } else {
      selectedStudents = applyRoundRobinRotation(availableStudents, numberOfStudents, targetDate)
    }

    if (selectedStudents.length === 0) {
      return NextResponse.json(
        { error: 'Could not assign students due to constraints' },
        { status: 400 }
      )
    }

    // Get or create current rotation cycle
    const currentCycle = await getOrCreateCurrentCycle(targetDate)

    // Create or update kitchen turn
    const kitchenTurn = await db.kitchenTurn.upsert({
      where: { date: targetDate },
      update: {
        status: 'PENDING',
        teamLeaderId: selectedStudents[0].id,
        cycleId: currentCycle.id,
        isLocked: false
      },
      create: {
        date: targetDate,
        status: 'PENDING',
        teamLeaderId: selectedStudents[0].id,
        cycleId: currentCycle.id
      }
    })

    // Remove existing assignments if updating
    if (existingAssignment) {
      await db.kitchenTurnStudent.deleteMany({
        where: { kitchenTurnId: kitchenTurn.id }
      })
    }

    // Assign students to kitchen turn
    await db.kitchenTurnStudent.createMany({
      data: selectedStudents.map(student => ({
        kitchenTurnId: kitchenTurn.id,
        studentId: student.id
      }))
    })

    // Update rotation positions and turn counts
    await updateRotationData(selectedStudents, targetDate)

    // Update cycle student data
    await updateCycleStudents(currentCycle.id, selectedStudents, targetDate)

    // Get the complete assignment
    const completeAssignment = await db.kitchenTurn.findUnique({
      where: { id: kitchenTurn.id },
      include: {
        assignedStudents: {
          include: {
            student: true
          }
        },
        teamLeader: true,
        cycle: true
      }
    })

    // Log the assignment
    await db.historyLog.create({
      data: {
        action: isSunday ? 'SUNDAY_EGG_RULE_ASSIGNMENT' : 'ROUND_ROBIN_ASSIGNMENT',
        updatedBy: 'SYSTEM',
        metadata: JSON.stringify({
          date: targetDate,
          assignedStudents: selectedStudents.map(s => s.id),
          teamLeaderId: selectedStudents[0].id,
          cycleId: currentCycle.id,
          isSunday,
          algorithm: isSunday ? 'SUNDAY_EGG_RULE' : 'ROUND_ROBIN',
          hasEggEater: isSunday ? selectedStudents.some(s => s.foodPreference === 'EGGS') : null
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully assigned kitchen duty for ${targetDate.toLocaleDateString()}`,
      assignment: completeAssignment,
      isSunday,
      cycleNumber: currentCycle.cycleNumber
    })
  } catch (error) {
    console.error('Error in advanced assignment:', error)
    return NextResponse.json(
      { error: 'Failed to assign kitchen duty' },
      { status: 500 }
    )
  }
}

function applySundaySpecialRule(students: any[], numberOfStudents: number): any[] {
  const eggPrefStudents = students.filter(s => s.foodPreference === 'EGGS')
  const nonEggStudents = students.filter(s => s.foodPreference !== 'EGGS')
  
  // Select students with least turns first
  const sortedStudents = students.sort((a, b) => a.totalKitchenTurns - b.totalKitchenTurns)
  let selected = sortedStudents.slice(0, numberOfStudents)
  
  // Check if selected team has at least one Egg-eater
  const hasEggEater = selected.some(s => s.foodPreference === 'EGGS')
  
  if (!hasEggEater && eggPrefStudents.length > 0) {
    // Find the Egg-eater with least turns
    const eggEaterToSwap = eggPrefStudents.sort((a, b) => a.totalKitchenTurns - b.totalKitchenTurns)[0]
    
    // Find the non-Egg student in selected team with most turns (to swap out)
    const nonEggToSwap = selected.filter(s => s.foodPreference !== 'EGGS')
      .sort((a, b) => b.totalKitchenTurns - a.totalKitchenTurns)[0]
    
    if (nonEggToSwap) {
      // Swap the non-Egg student with the Egg-eater
      const swapIndex = selected.findIndex(s => s.id === nonEggToSwap.id)
      selected[swapIndex] = eggEaterToSwap
    }
  }
  
  return selected
}

function applyRoundRobinRotation(students: any[], numberOfStudents: number, targetDate: Date): any[] {
  // Sort by rotation position first, then by last turn date
  const sortedStudents = students.sort((a, b) => {
    if (a.rotationPosition !== b.rotationPosition) {
      return a.rotationPosition - b.rotationPosition
    }
    // If positions are same, use last turn date
    if (!a.lastTurnDate) return -1
    if (!b.lastTurnDate) return 1
    return new Date(a.lastTurnDate).getTime() - new Date(b.lastTurnDate).getTime()
  })

  return sortedStudents.slice(0, numberOfStudents)
}

async function getOrCreateCurrentCycle(targetDate: Date) {
  // Find active cycle
  let currentCycle = await db.rotationCycle.findFirst({
    where: { isActive: true },
    include: {
      students: true
    },
    orderBy: { cycleNumber: 'desc' }
  })

  // If no active cycle or cycle is complete, create new one
  if (!currentCycle || isCycleComplete(currentCycle)) {
    // Close previous cycle if exists
    if (currentCycle) {
      await db.rotationCycle.update({
        where: { id: currentCycle.id },
        data: { 
          isActive: false,
          endDate: new Date()
        }
      })
    }

    // Create new cycle
    const cycleNumber = currentCycle ? currentCycle.cycleNumber + 1 : 1
    currentCycle = await db.rotationCycle.create({
      data: {
        cycleNumber,
        startDate: new Date(),
        totalDays: 7,
        isActive: true
      }
    })

    // Initialize cycle students
    const activeStudents = await db.user.findMany({
      where: {
        status: 'ACTIVE',
        role: 'STUDENT'
      },
      orderBy: { rotationPosition: 'asc' }
    })

    await db.rotationCycleStudent.createMany({
      data: activeStudents.map((student, index) => ({
        cycleId: currentCycle.id,
        studentId: student.id,
        position: index
      }))
    })
  }

  return currentCycle
}

function isCycleComplete(cycle: any): boolean {
  // A cycle is complete if all students have had at least one turn
  // or if 7 days have passed
  const cycleDuration = Date.now() - new Date(cycle.startDate).getTime()
  const daysInCycle = cycleDuration / (1000 * 60 * 60 * 24)
  
  return daysInCycle >= cycle.totalDays
}

async function updateRotationData(students: any[], targetDate: Date) {
  await Promise.all(
    students.map(async (student, index) => {
      // Update rotation position (move to end)
      await db.user.update({
        where: { id: student.id },
        data: {
          rotationPosition: (student.rotationPosition || 0) + 1000, // Move to end
          totalKitchenTurns: student.totalKitchenTurns + 1,
          lastTurnDate: targetDate
        }
      })
    })
  )

  // Rebalance rotation positions
  const allStudents = await db.user.findMany({
    where: {
      status: 'ACTIVE',
      role: 'STUDENT'
    },
    orderBy: { rotationPosition: 'asc' }
  })

  await Promise.all(
    allStudents.map((student, index) =>
      db.user.update({
        where: { id: student.id },
        data: { rotationPosition: index }
      })
    )
  )
}

async function updateCycleStudents(cycleId: string, selectedStudents: any[], targetDate: Date) {
  await Promise.all(
    selectedStudents.map(student =>
      db.rotationCycleStudent.upsert({
        where: {
          cycleId_studentId: {
            cycleId,
            studentId: student.id
          }
        },
        update: {
          turnsCompleted: {
            increment: 1
          },
          lastAssignedDate: targetDate
        },
        create: {
          cycleId,
          studentId: student.id,
          position: 0, // Will be updated later
          turnsCompleted: 1,
          lastAssignedDate: targetDate
        }
      })
    )
  )
}