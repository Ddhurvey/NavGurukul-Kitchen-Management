import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const currentFC = await db.foodCoordinator.findFirst({
      where: {
        isActive: true,
        startDate: {
          lte: new Date()
        },
        endDate: {
          gte: new Date()
        }
      },
      include: {
        student: true
      }
    })

    const allFCs = await db.foodCoordinator.findMany({
      include: {
        student: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      current: currentFC,
      history: allFCs
    })
  } catch (error) {
    console.error('Error fetching food coordinators:', error)
    return NextResponse.json({ error: 'Failed to fetch food coordinators' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { studentId, startDate, endDate } = data

    // Deactivate any existing FC assignments
    await db.foodCoordinator.updateMany({
      where: {
        isActive: true
      },
      data: {
        isActive: false
      }
    })

    const fc = await db.foodCoordinator.create({
      data: {
        studentId,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      },
      include: {
        student: true
      }
    })

    return NextResponse.json(fc, { status: 201 })
  } catch (error) {
    console.error('Error creating food coordinator:', error)
    return NextResponse.json({ error: 'Failed to create food coordinator' }, { status: 500 })
  }
}