import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get all duties and sort by date
    const allDuties = await db.kitchenDuty.findMany({
      include: {
        teamLead: true,
        assignments: {
          include: {
            student: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    // Find today's and tomorrow's duties
    const todayDuty = allDuties.find(duty => {
      const dutyDate = new Date(duty.date)
      dutyDate.setHours(0, 0, 0, 0)
      return dutyDate.getTime() === today.getTime()
    })

    const tomorrowDuty = allDuties.find(duty => {
      const dutyDate = new Date(duty.date)
      dutyDate.setHours(0, 0, 0, 0)
      return dutyDate.getTime() === tomorrow.getTime()
    })

    console.log('Today:', today.toISOString())
    console.log('Tomorrow:', tomorrow.toISOString())
    console.log('Today duty found:', !!todayDuty)
    console.log('Tomorrow duty found:', !!tomorrowDuty)

    return NextResponse.json({
      today: todayDuty,
      tomorrow: tomorrowDuty
    })
  } catch (error) {
    console.error('Error fetching kitchen duties:', error)
    return NextResponse.json({ error: 'Failed to fetch kitchen duties' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { date, studentIds, teamLeadId } = data

    const dutyDate = new Date(date)
    dutyDate.setHours(0, 0, 0, 0)

    const kitchenDuty = await db.kitchenDuty.create({
      data: {
        date: dutyDate,
        teamLeadId,
        assignments: {
          create: studentIds.map((studentId: string, index: number) => ({
            studentId,
            isTeamLead: studentId === teamLeadId
          }))
        }
      },
      include: {
        teamLead: true,
        assignments: {
          include: {
            student: true
          }
        }
      }
    })

    return NextResponse.json(kitchenDuty, { status: 201 })
  } catch (error) {
    console.error('Error creating kitchen duty:', error)
    return NextResponse.json({ error: 'Failed to create kitchen duty' }, { status: 500 })
  }
}