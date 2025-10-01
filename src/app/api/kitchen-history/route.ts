import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '30')
    
    // Build where clause
    let whereClause: any = {}
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    } else if (startDate) {
      whereClause.date = {
        gte: new Date(startDate)
      }
    } else if (endDate) {
      whereClause.date = {
        lte: new Date(endDate)
      }
    }

    const history = await db.kitchenHistory.findMany({
      where: whereClause,
      orderBy: {
        date: 'desc'
      },
      take: limit,
      select: {
        id: true,
        date: true,
        teamName: true,
        teamLeaderId: true,
        member2Id: true,
        member3Id: true,
        member4Id: true,
        teamLeaderName: true,
        member2Name: true,
        member3Name: true,
        member4Name: true,
        breakfast: true,
        lunch: true,
        snacks: true,
        dinner: true,
        foodPreference: true,
        isCompleted: true,
        notes: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json(history)
  } catch (error) {
    console.error('Error fetching kitchen history:', error)
    return NextResponse.json({ error: 'Failed to fetch kitchen history' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Check if history for this date already exists
    const existingHistory = await db.kitchenHistory.findUnique({
      where: { date: new Date(data.date) }
    })

    if (existingHistory) {
      return NextResponse.json({ 
        error: 'Kitchen history for this date already exists. Use PUT to update.' 
      }, { status: 409 })
    }

    const history = await db.kitchenHistory.create({
      data: {
        date: new Date(data.date),
        teamName: data.teamName,
        teamLeaderId: data.teamLeaderId || null,
        member2Id: data.member2Id || null,
        member3Id: data.member3Id || null,
        member4Id: data.member4Id || null,
        teamLeaderName: data.teamLeaderName,
        member2Name: data.member2Name,
        member3Name: data.member3Name,
        member4Name: data.member4Name,
        breakfast: data.breakfast,
        lunch: data.lunch,
        snacks: data.snacks,
        dinner: data.dinner,
        foodPreference: data.foodPreference,
        isCompleted: data.isCompleted || false,
        notes: data.notes
      }
    })

    return NextResponse.json(history, { status: 201 })
  } catch (error) {
    console.error('Error creating kitchen history:', error)
    return NextResponse.json({ error: 'Failed to create kitchen history' }, { status: 500 })
  }
}