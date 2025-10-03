import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getIndiaToday, getIndiaTomorrow, formatIndiaDate } from '@/lib/time'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const { date, force = false } = await request.json()
    
    // Default to tomorrow if no date provided
    const targetDate = date ? new Date(date) : getIndiaTomorrow()
    const today = getIndiaToday()
    
    // Check if assignment already exists and not forced
    const existingAssignment = await db.kitchenTurn.findUnique({
      where: { date: targetDate },
      include: {
        assignedStudents: {
          include: {
            student: true
          }
        },
        teamLeader: true
      }
    })

    if (existingAssignment && existingAssignment.assignedStudents.length > 0 && !force) {
      return NextResponse.json({
        success: true,
        message: 'Assignment already exists',
        assignment: existingAssignment,
        aiDecision: 'existing_assignment'
      })
    }

    // Get all active students
    const activeStudents = await db.user.findMany({
      where: {
        status: 'ACTIVE',
        role: 'STUDENT'
      },
      include: {
        leaves: {
          where: {
            status: 'APPROVED',
            startDate: { lte: targetDate },
            endDate: { gte: targetDate }
          }
        }
      }
    })

    // Filter students on leave
    const availableStudents = activeStudents.filter(student => student.leaves.length === 0)

    if (availableStudents.length < 4) {
      return NextResponse.json({
        success: false,
        error: 'Not enough available students for kitchen duty',
        availableCount: availableStudents.length,
        requiredCount: 4
      }, { status: 400 })
    }

    // Get kitchen turn counts for each student
    const studentCounts = await Promise.all(
      availableStudents.map(async (student) => {
        const count = await db.kitchenTurnStudent.count({
          where: {
            studentId: student.id
          }
        })
        return {
          ...student,
          kitchenCount: count
        }
      })
    )

    // Use AI to make decision
    const aiDecision = await makeKitchenAIDecision(studentCounts, targetDate, existingAssignment)
    
    if (!aiDecision.success) {
      return NextResponse.json({
        success: false,
        error: 'AI decision failed',
        details: aiDecision.error
      }, { status: 500 })
    }

    // Create or update assignment based on AI decision
    const assignment = await createAssignmentFromAIDecision(aiDecision, targetDate)

    // Log the AI decision
    try {
      await db.historyLog.create({
        data: {
          action: 'KITCHEN_AI_DECISION',
          updatedBy: 'SYSTEM',
          metadata: JSON.stringify({
            targetDate: targetDate.toISOString(),
            decisionType: aiDecision.decisionType,
            reasoning: aiDecision.reasoning,
            selectedStudents: aiDecision.selectedStudents.map(s => s.id),
            confidence: aiDecision.confidence,
            force
          })
        }
      })
    } catch (logError) {
      console.error('Failed to log AI decision:', logError)
      // Continue even if logging fails
    }

    return NextResponse.json({
      success: true,
      message: 'Kitchen AI decision completed successfully',
      assignment,
      aiDecision: {
        decisionType: aiDecision.decisionType,
        reasoning: aiDecision.reasoning,
        confidence: aiDecision.confidence,
        selectedStudents: aiDecision.selectedStudents.map(s => ({
          id: s.id,
          name: s.name,
          foodPreference: s.foodPreference,
          kitchenCount: s.kitchenHistory.length
        }))
      }
    })

  } catch (error) {
    console.error('Error in kitchen AI decision:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to make kitchen AI decision',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function makeKitchenAIDecision(students: any[], targetDate: Date, existingAssignment: any) {
  try {
    // First try simple rotation (more reliable)
    const sortedStudents = students.sort((a, b) => a.kitchenCount - b.kitchenCount)
    const selectedStudents = sortedStudents.slice(0, 4)
    
    // Check if Sunday special rule applies
    const isSunday = targetDate.getDay() === 0
    if (isSunday) {
      const hasEggPreference = selectedStudents.some(s => s.foodPreference === 'EGGS')
      if (!hasEggPreference) {
        // Replace one student with egg preference
        const eggStudent = students.find(s => s.foodPreference === 'EGGS' && !selectedStudents.includes(s))
        if (eggStudent) {
          selectedStudents[3] = eggStudent // Replace last student
        }
      }
    }
    
    return {
      success: true,
      decisionType: isSunday ? 'sunday_special_rotation' : 'fair_rotation',
      reasoning: `Selected 4 students with fewest kitchen duties${isSunday ? ' (Sunday special rule applied)' : ''}`,
      confidence: 0.9,
      selectedStudents,
      teamLeaderId: selectedStudents[0].id
    }

  } catch (error) {
    console.error('Error making AI decision:', error)
    
    // Ultimate fallback
    const selectedStudents = students.slice(0, 4)
    
    return {
      success: true,
      decisionType: 'emergency_fallback',
      reasoning: 'Emergency fallback - selected first 4 available students',
      confidence: 0.3,
      selectedStudents,
      teamLeaderId: selectedStudents[0].id
    }
  }
}

async function createAssignmentFromAIDecision(aiDecision: any, targetDate: Date) {
  try {
    // Create or update kitchen turn
    const kitchenTurn = await db.kitchenTurn.upsert({
      where: { date: targetDate },
      update: {
        teamLeaderId: aiDecision.teamLeaderId,
        status: 'PENDING',
        isLocked: false
      },
      create: {
        date: targetDate,
        teamLeaderId: aiDecision.teamLeaderId,
        status: 'PENDING',
        isLocked: false
      },
      include: {
        assignedStudents: {
          include: {
            student: true
          }
        },
        teamLeader: true
      }
    })

    // Remove existing assignments if any
    await db.kitchenTurnStudent.deleteMany({
      where: { kitchenTurnId: kitchenTurn.id }
    })

    // Create new assignments
    await db.kitchenTurnStudent.createMany({
      data: aiDecision.selectedStudents.map((student: any) => ({
        kitchenTurnId: kitchenTurn.id,
        studentId: student.id
      }))
    })

    // Return updated assignment
    return await db.kitchenTurn.findUnique({
      where: { id: kitchenTurn.id },
      include: {
        assignedStudents: {
          include: {
            student: true
          }
        },
        teamLeader: true
      }
    })

  } catch (error) {
    console.error('Error creating assignment from AI decision:', error)
    throw error
  }
}

export async function GET() {
  try {
    const today = getIndiaToday()
    const tomorrow = getIndiaTomorrow()
    
    // Check today's and tomorrow's assignments
    const todayAssignment = await db.kitchenTurn.findUnique({
      where: { date: today },
      include: {
        assignedStudents: {
          include: {
            student: true
          }
        },
        teamLeader: true
      }
    })

    const tomorrowAssignment = await db.kitchenTurn.findUnique({
      where: { date: tomorrow },
      include: {
        assignedStudents: {
          include: {
            student: true
          }
        },
        teamLeader: true
      }
    })

    // Get recent AI decisions
    const recentDecisions = await db.historyLog.findMany({
      where: {
        action: 'KITCHEN_AI_DECISION'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })

    return NextResponse.json({
      success: true,
      today: {
        date: formatIndiaDate(today),
        assignment: todayAssignment,
        needsAssignment: !todayAssignment || todayAssignment.assignedStudents.length === 0
      },
      tomorrow: {
        date: formatIndiaDate(tomorrow),
        assignment: tomorrowAssignment,
        needsAssignment: !tomorrowAssignment || tomorrowAssignment.assignedStudents.length === 0
      },
      recentAIDecisions: recentDecisions.map(log => ({
        date: log.createdAt,
        metadata: JSON.parse(log.metadata || '{}')
      }))
    })

  } catch (error) {
    console.error('Error getting kitchen AI status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get kitchen AI status'
    }, { status: 500 })
  }
}