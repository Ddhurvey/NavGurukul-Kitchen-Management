import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

async function assignKitchenDuty(targetDate: Date) {
  try {
    // Get all active students who are eligible for kitchen duty
    const eligibleStudents = await db.student.findMany({
      where: {
        status: 'ACTIVE',
        workType: 'KITCHEN',
        OR: [
          { leaveStartAt: null },
          { leaveEndAt: { lt: targetDate } },
          { leaveStartAt: { gt: targetDate } }
        ]
      },
      orderBy: [
        { lastDutyDate: 'asc' }, // Students who haven't done duty recently get priority
        { totalDuties: 'asc' }, // Students with fewer total duties get priority
        { joinedAt: 'asc' } // Newer students get priority
      ]
    })

    if (eligibleStudents.length < 4) {
      throw new Error('Not enough eligible students for kitchen duty')
    }

    // Check if duty already exists for this date
    const existingDuty = await db.kitchenDuty.findFirst({
      where: {
        date: targetDate
      }
    })

    if (existingDuty) {
      return existingDuty
    }

    // Get yesterday's duty to avoid consecutive assignments
    const yesterday = new Date(targetDate)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const yesterdayDuty = await db.kitchenDuty.findFirst({
      where: {
        date: yesterday
      },
      select: {
        teamLeaderId: true,
        member2Id: true,
        member3Id: true,
        member4Id: true
      }
    })

    const yesterdayStudentIds = yesterdayDuty ? [
      yesterdayDuty.teamLeaderId,
      yesterdayDuty.member2Id,
      yesterdayDuty.member3Id,
      yesterdayDuty.member4Id
    ] : []

    // Filter out students who did duty yesterday
    const availableStudents = eligibleStudents.filter(
      student => !yesterdayStudentIds.includes(student.id)
    )

    // If we don't have enough students after filtering, use all eligible students
    const finalStudents = availableStudents.length >= 4 ? availableStudents : eligibleStudents

    // Select 4 students (1 Team Leader + 3 members)
    const selectedStudents = finalStudents.slice(0, 4)
    const [teamLeader, member2, member3, member4] = selectedStudents

    // Create the kitchen duty assignment
    const newDuty = await db.kitchenDuty.create({
      data: {
        date: targetDate,
        teamLeaderId: teamLeader.id,
        member2Id: member2.id,
        member3Id: member3.id,
        member4Id: member4.id,
        breakfast: 'Poha with Sev',
        lunch: 'Dal Makhani + Rice + Roti',
        snacks: 'Samosa + Chai',
        dinner: 'Mixed Veg + Parantha'
      },
      include: {
        teamLeader: {
          select: { id: true, name: true, discordId: true }
        },
        member2: {
          select: { id: true, name: true, discordId: true }
        },
        member3: {
          select: { id: true, name: true, discordId: true }
        },
        member4: {
          select: { id: true, name: true, discordId: true }
        }
      }
    })

    // Update students' duty counts and last duty date
    await Promise.all([
      db.student.update({
        where: { id: teamLeader.id },
        data: {
          totalDuties: { increment: 1 },
          lastDutyDate: targetDate
        }
      }),
      db.student.update({
        where: { id: member2.id },
        data: {
          totalDuties: { increment: 1 },
          lastDutyDate: targetDate
        }
      }),
      db.student.update({
        where: { id: member3.id },
        data: {
          totalDuties: { increment: 1 },
          lastDutyDate: targetDate
        }
      }),
      db.student.update({
        where: { id: member4.id },
        data: {
          totalDuties: { increment: 1 },
          lastDutyDate: targetDate
        }
      })
    ])

    return newDuty
  } catch (error) {
    console.error('Error assigning kitchen duty:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const { date } = await request.json()
    
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    const targetDate = new Date(date)
    const duty = await assignKitchenDuty(targetDate)

    return NextResponse.json(duty, { status: 201 })
  } catch (error) {
    console.error('Error in auto-assign API:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to assign kitchen duty' 
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Auto-assign duties for the next 7 days
    const assignments: any[] = []
    const today = new Date()
    
    for (let i = 1; i <= 7; i++) {
      const targetDate = new Date(today)
      targetDate.setDate(today.getDate() + i)
      
      try {
        const duty = await assignKitchenDuty(targetDate)
        assignments.push(duty)
      } catch (error) {
        console.error(`Failed to assign duty for ${targetDate.toDateString()}:`, error)
      }
    }

    return NextResponse.json({ 
      message: `Created ${assignments.length} duty assignments`,
      assignments 
    })
  } catch (error) {
    console.error('Error in bulk auto-assign:', error)
    return NextResponse.json({ 
      error: 'Failed to create bulk assignments' 
    }, { status: 500 })
  }
}