import { NextRequest, NextResponse } from 'next/server'
import { KitchenDutyScheduler } from '@/lib/kitchen-duty-scheduler'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN'])
  if (!auth.user) return auth.response
  try {
    const data = await request.json()
    const { daysAhead = 1, date } = data

    // Get the date for assignment
    const targetDate = date ? new Date(date) : new Date()
    if (!date) {
      targetDate.setDate(targetDate.getDate() + daysAhead)
    }
    targetDate.setHours(0, 0, 0, 0)

    // Check if assignment already exists
    const existingDuty = await db.kitchenDuty.findUnique({
      where: { date: targetDate }
    })

    if (existingDuty) {
      return NextResponse.json({
        success: false,
        message: `Kitchen duty already assigned for ${targetDate.toLocaleDateString()}`,
        existingDuty
      })
    }

    // Use the new round-robin scheduler
    const scheduler = new KitchenDutyScheduler()
    const result = await scheduler.assignDuty(targetDate)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

    // Create food menu if it doesn't exist
    const existingMenu = await db.foodMenu.findUnique({
      where: { date: targetDate }
    })

    if (!existingMenu) {
      // Get current Food Coordinator
      const currentFC = await db.foodCoordinator.findFirst({
        where: {
          isActive: true,
          startDate: {
            lte: new Date()
          },
          endDate: {
            gte: new Date()
          }
        }
      })

      if (currentFC) {
        await db.foodMenu.create({
          data: {
            date: targetDate,
            breakfast: 'Poha',
            lunch: 'Dal+Rice',
            snacks: '(none)',
            dinner: 'veg+roti',
            fcId: currentFC.id
          }
        })
      }
    }

    console.log(`Round-robin assignment completed for ${targetDate.toISOString().split('T')[0]}:`, {
      cycleNumber: result.cycleNumber,
      dayInCycle: result.dayInCycle,
      isSundaySpecial: result.isSundaySpecial,
      teamLead: result.teamLead?.name,
      teamMembers: result.teamMembers?.map(m => m.name) || []
    })

    return NextResponse.json({
      success: true,
      message: `Kitchen duty assigned for ${targetDate.toLocaleDateString()}${result.isSundaySpecial ? ' (Sunday Special)' : ''}`,
      kitchenDuty: result,
      teamLead: result.teamLead?.name,
      teamMembers: result.teamMembers?.map(s => s.name) || [],
      cycleNumber: result.cycleNumber,
      dayInCycle: result.dayInCycle,
      isSundaySpecial: result.isSundaySpecial,
      foodPreferences: [
        { name: result.teamLead?.name, preference: result.teamLead?.foodPreference },
        ...(result.teamMembers?.map(s => ({ name: s.name, preference: s.foodPreference })) || [])
      ].filter(Boolean)
    })

  } catch (error) {
    console.error('Error in auto-assign:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to auto-assign kitchen duty' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN'])
  if (!auth.user) return auth.response
  try {
    // Get upcoming assignments for the next 7 days
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const upcomingDuties = await db.kitchenDuty.findMany({
      where: {
        date: {
          gte: today
        }
      },
      include: {
        teamLead: true,
        assignments: {
          include: {
            student: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      },
      take: 7
    })

    // Calculate assignment statistics for the last 30 days
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const pastDuties = await db.kitchenDuty.findMany({
      where: {
        date: {
          gte: thirtyDaysAgo,
          lt: today
        }
      },
      include: {
        assignments: {
          include: {
            student: true
          }
        }
      }
    })

    const assignmentStats = new Map<string, { name: string; count: number; lastAssigned: Date }>()

    pastDuties.forEach(duty => {
      duty.assignments.forEach(assignment => {
        const existing = assignmentStats.get(assignment.studentId)
        if (existing) {
          existing.count++
          if (duty.date > existing.lastAssigned) {
            existing.lastAssigned = duty.date
          }
        } else {
          assignmentStats.set(assignment.studentId, {
            name: assignment.student.name,
            count: 1,
            lastAssigned: duty.date
          })
        }
      })
    })

    return NextResponse.json({
      upcomingDuties,
      totalAssigned: upcomingDuties.length,
      assignmentStats: Array.from(assignmentStats.values()).sort((a, b) => b.count - a.count),
      rotationFairness: {
        totalStudentsTracked: assignmentStats.size,
        mostAssigned: Math.max(...Array.from(assignmentStats.values()).map(s => s.count)),
        leastAssigned: Math.min(...Array.from(assignmentStats.values()).map(s => s.count)),
        averageAssignments: Array.from(assignmentStats.values()).reduce((sum, s) => sum + s.count, 0) / assignmentStats.size
      }
    })
  } catch (error) {
    console.error('Error fetching upcoming duties:', error)
    return NextResponse.json({ error: 'Failed to fetch upcoming duties' }, { status: 500 })
  }
}