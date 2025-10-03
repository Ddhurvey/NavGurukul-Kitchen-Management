import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET check if menu can be edited for a specific date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    
    if (!dateParam) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      )
    }

    const date = new Date(dateParam)
    const now = new Date()
    
    // Convert to India timezone
    const indiaTime = new Date(now.getTime() + (5.5 * 3600000))
    const indiaDate = new Date(indiaTime.getFullYear(), indiaTime.getMonth(), indiaTime.getDate())
    const indiaHour = indiaTime.getHours()
    
    // Check if the date is in the past
    const isPastDate = date < indiaDate
    const isToday = date.toDateString() === indiaDate.toDateString()
    const isPast9PM = isToday && indiaHour >= 21
    
    // Get the menu for the date
    const foodMenu = await db.foodMenu.findUnique({
      where: { date },
      include: {
        updatedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })

    const canEdit = !isPastDate && !(isToday && isPast9PM)
    
    // If it's a past date and menu exists, lock it
    if (isPastDate && foodMenu && !foodMenu.isLocked) {
      await db.foodMenu.update({
        where: { id: foodMenu.id },
        data: { isLocked: true }
      })
      foodMenu.isLocked = true
    }

    return NextResponse.json({
      canEdit,
      isLocked: foodMenu?.isLocked || isPastDate,
      isPastDate,
      isToday,
      isPast9PM,
      menu: foodMenu,
      message: isPastDate 
        ? 'Menu is locked and cannot be edited (past date)'
        : isToday && isPast9PM
        ? 'Menu is locked for today (past 9 PM cutoff)'
        : 'Menu can be edited'
    })
  } catch (error) {
    console.error('Error checking menu edit permissions:', error)
    return NextResponse.json(
      { error: 'Failed to check menu permissions' },
      { status: 500 }
    )
  }
}

// POST lock menu for a specific date (admin only)
export async function POST(request: NextRequest) {
  try {
    const { date, userId, reason } = await request.json()
    
    // Verify user is admin
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'FC')) {
      return NextResponse.json(
        { error: 'Only Admin and FC can lock menus' },
        { status: 403 }
      )
    }

    const foodMenu = await db.foodMenu.update({
      where: { date: new Date(date) },
      data: { 
        isLocked: true,
        updatedAt: new Date()
      },
      include: {
        updatedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Log the locking action
    await db.historyLog.create({
      data: {
        action: 'FOOD_MENU_LOCKED',
        updatedBy: userId,
        metadata: JSON.stringify({
          date,
          reason: reason || 'Manual lock by admin',
          lockedAt: new Date()
        })
      }
    })

    return NextResponse.json({
      message: 'Menu locked successfully',
      menu: foodMenu
    })
  } catch (error) {
    console.error('Error locking menu:', error)
    return NextResponse.json(
      { error: 'Failed to lock menu' },
      { status: 500 }
    )
  }
}