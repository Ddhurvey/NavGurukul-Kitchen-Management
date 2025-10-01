import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const menu = await db.foodMenu.findUnique({
      where: { date: today },
      include: {
        fc: {
          include: {
            student: true
          }
        }
      }
    })

    return NextResponse.json(menu)
  } catch (error) {
    console.error('Error fetching food menu:', error)
    return NextResponse.json({ error: 'Failed to fetch food menu' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { date, breakfast, lunch, snacks, dinner, fcId } = data

    const menuDate = new Date(date)
    menuDate.setHours(0, 0, 0, 0)

    const menu = await db.foodMenu.create({
      data: {
        date: menuDate,
        breakfast,
        lunch,
        snacks,
        dinner,
        fcId
      },
      include: {
        fc: {
          include: {
            student: true
          }
        }
      }
    })

    return NextResponse.json(menu, { status: 201 })
  } catch (error) {
    console.error('Error creating food menu:', error)
    return NextResponse.json({ error: 'Failed to create food menu' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const { id, breakfast, lunch, snacks, dinner } = data

    const menu = await db.foodMenu.update({
      where: { id },
      data: {
        breakfast,
        lunch,
        snacks,
        dinner
      },
      include: {
        fc: {
          include: {
            student: true
          }
        }
      }
    })

    return NextResponse.json(menu)
  } catch (error) {
    console.error('Error updating food menu:', error)
    return NextResponse.json({ error: 'Failed to update food menu' }, { status: 500 })
  }
}