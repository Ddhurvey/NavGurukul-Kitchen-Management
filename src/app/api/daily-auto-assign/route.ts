import { NextRequest, NextResponse } from 'next/server'
import { KitchenDutyScheduler } from '@/lib/kitchen-duty-scheduler'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Get the date for assignment (tomorrow by default)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    console.log(`=== DAILY AUTO-ASSIGNMENT FOR ${tomorrow.toISOString().split('T')[0]} ===`)

    // Check if assignment already exists
    const existingDuty = await db.kitchenDuty.findUnique({
      where: { date: tomorrow }
    })

    if (existingDuty) {
      console.log('Kitchen duty already assigned for tomorrow')
      return NextResponse.json({
        success: true,
        message: 'Kitchen duty already assigned for tomorrow',
        alreadyAssigned: true,
        date: tomorrow.toISOString().split('T')[0]
      })
    }

    // Use the new round-robin scheduler
    const scheduler = new KitchenDutyScheduler()
    const result = await scheduler.assignDuty(tomorrow)

    if (!result.success) {
      console.error('Round-robin assignment failed:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

    // Create food menu if it doesn't exist
    const existingMenu = await db.foodMenu.findUnique({
      where: { date: tomorrow }
    })

    if (!existingMenu) {
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
            date: tomorrow,
            breakfast: 'Poha',
            lunch: 'Dal+Rice',
            snacks: '(none)',
            dinner: 'veg+roti',
            fcId: currentFC.id
          }
        })
      }
    }

    console.log('✅ Daily auto-assignment completed successfully!', {
      cycleNumber: result.cycleNumber,
      dayInCycle: result.dayInCycle,
      isSundaySpecial: result.isSundaySpecial,
      teamLead: result.teamLead?.name,
      teamMembers: result.teamMembers?.map(m => m.name) || []
    })

    return NextResponse.json({
      success: true,
      message: `Kitchen duty auto-assigned for ${tomorrow.toLocaleDateString()}${result.isSundaySpecial ? ' (Sunday Special)' : ''}`,
      date: tomorrow.toISOString().split('T')[0],
      teamLead: result.teamLead?.name,
      teamMembers: result.teamMembers?.map(s => s.name) || [],
      cycleNumber: result.cycleNumber,
      dayInCycle: result.dayInCycle,
      isSundaySpecial: result.isSundaySpecial,
      kitchenDuty: result
    })

  } catch (error) {
    console.error('Error in daily auto-assignment:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to auto-assign kitchen duty' 
    }, { status: 500 })
  }
}

// GET endpoint to check status
export async function GET() {
  try {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    const existingDuty = await db.kitchenDuty.findUnique({
      where: { date: tomorrow },
      include: {
        teamLead: true,
        assignments: {
          include: {
            student: true
          }
        }
      }
    })

    return NextResponse.json({
      date: tomorrow.toISOString().split('T')[0],
      assigned: !!existingDuty,
      duty: existingDuty
    })
  } catch (error) {
    console.error('Error checking auto-assignment status:', error)
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}