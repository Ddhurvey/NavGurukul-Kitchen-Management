import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayDuty = await db.kitchenDuty.findFirst({
      where: {
        date: {
          gte: today,
          lt: tomorrow
        }
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

    if (!todayDuty) {
      return NextResponse.json({ error: 'No duty assigned for today' }, { status: 404 })
    }

    const dutyData = {
      id: todayDuty.id,
      date: todayDuty.date,
      teamLeader: todayDuty.teamLeader,
      members: [todayDuty.member2, todayDuty.member3, todayDuty.member4],
      menu: {
        breakfast: todayDuty.breakfast,
        lunch: todayDuty.lunch,
        snacks: todayDuty.snacks,
        dinner: todayDuty.dinner
      },
      isCompleted: todayDuty.isCompleted
    }

    return NextResponse.json(dutyData)
  } catch (error) {
    console.error('Error fetching today\'s duty:', error)
    return NextResponse.json({ error: 'Failed to fetch today\'s duty' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const duty = await db.kitchenDuty.create({
      data: {
        date: new Date(data.date),
        teamLeaderId: data.teamLeaderId,
        member2Id: data.member2Id,
        member3Id: data.member3Id,
        member4Id: data.member4Id,
        breakfast: data.breakfast,
        lunch: data.lunch,
        snacks: data.snacks,
        dinner: data.dinner
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

    return NextResponse.json(duty, { status: 201 })
  } catch (error) {
    console.error('Error creating kitchen duty:', error)
    return NextResponse.json({ error: 'Failed to create kitchen duty' }, { status: 500 })
  }
}