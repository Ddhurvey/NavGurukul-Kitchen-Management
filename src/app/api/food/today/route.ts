import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getIndiaToday, isIndiaPast9PM } from '@/lib/time'

export async function GET() {
  try {
    const today = getIndiaToday()
    
    let foodMenu = await db.foodMenu.findUnique({
      where: {
        date: today
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

    if (!foodMenu) {
      // Find any active user to use as the default updater
      const defaultUser = await db.user.findFirst({
        where: { status: 'ACTIVE' },
        select: { id: true }
      })
      
      if (!defaultUser) {
        return NextResponse.json(
          { error: 'No active users found in the system' },
          { status: 404 }
        )
      }

      // Create default menu for today
      foodMenu = await db.foodMenu.create({
        data: {
          date: today,
          breakfast: 'Poha',
          lunch: 'Dal + Rice',
          snacks: 'Samosa',
          dinner: 'Veg + Roti',
          updatedBy: defaultUser.id
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
    }

    return NextResponse.json(foodMenu)
  } catch (error) {
    console.error('Error fetching today\'s food menu:', error)
    return NextResponse.json(
      { error: 'Failed to fetch food menu' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { breakfast, lunch, snacks, dinner, updatedBy } = await request.json()
    
    // Get user permissions
    const user = await db.user.findUnique({
      where: { id: updatedBy },
      select: { role: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const today = getIndiaToday()
    const indiaTime = new Date(today.getTime() + (5.5 * 3600000))
    const isSunday = indiaTime.getDay() === 0

    // Check if it's past 9 PM India time (can't edit today's menu after 9 PM)
    if (isIndiaPast9PM()) {
      return NextResponse.json(
        { error: 'Cannot edit today\'s menu after 9:00 PM' },
        { status: 400 }
      )
    }

    // Check Sunday rule validation
    if (isSunday) {
      const sundayItems = `${breakfast || ''} ${lunch || ''} ${snacks || ''} ${dinner || ''}`.toLowerCase()
      const hasEgg = sundayItems.includes('egg')
      const hasPaneer = sundayItems.includes('paneer')
      
      if (!hasEgg || !hasPaneer) {
        return NextResponse.json(
          { error: 'Sunday menu must include both Egg and Paneer items' },
          { status: 400 }
        )
      }
    }

    // Check editing permissions
    const canEdit = user.role === 'FC' || user.role === 'ADMIN' || user.role === 'TEAM_MEMBER'
    
    if (!canEdit) {
      return NextResponse.json(
        { error: 'Only FC, Team Members, and Admin can edit the menu' },
        { status: 403 }
      )
    }

    const foodMenu = await db.foodMenu.upsert({
      where: {
        date: today
      },
      update: {
        breakfast,
        lunch,
        snacks,
        dinner,
        updatedBy,
        // For Sunday, mark as special menu
        ...(isSunday && { 
          mainDish: lunch?.includes('Egg') ? 'Egg Curry' : lunch?.includes('Paneer') ? 'Paneer Dish' : null,
          dishType: lunch?.includes('Egg') ? 'EGG' : lunch?.includes('Paneer') ? 'PANEER' : 'VEG'
        })
      },
      create: {
        date: today,
        breakfast,
        lunch,
        snacks,
        dinner,
        updatedBy,
        // For Sunday, mark as special menu
        ...(isSunday && { 
          mainDish: lunch?.includes('Egg') ? 'Egg Curry' : lunch?.includes('Paneer') ? 'Paneer Dish' : null,
          dishType: lunch?.includes('Egg') ? 'EGG' : lunch?.includes('Paneer') ? 'PANEER' : 'VEG'
        })
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

    // Log the action with permission level
    await db.historyLog.create({
      data: {
        action: 'FOOD_MENU_UPDATED',
        updatedBy,
        metadata: JSON.stringify({
          date: today,
          breakfast,
          lunch,
          snacks,
          dinner,
          userRole: user.role,
          isSunday,
          updatedAt: new Date()
        })
      }
    })

    return NextResponse.json(foodMenu)
  } catch (error) {
    console.error('Error updating food menu:', error)
    return NextResponse.json(
      { error: 'Failed to update food menu' },
      { status: 500 }
    )
  }
}