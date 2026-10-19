import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { requireRole } from '@/lib/auth'

const updateFoodMenuSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  breakfast: z.string().optional(),
  lunch: z.string().optional(),
  snacks: z.string().optional(),
  dinner: z.string().optional(),
  mainDish: z.string().optional(),
  dishType: z.enum(['EGG', 'PANEER', 'VEG']).optional(),
})

async function getCurrentUser(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  
  if (!token) {
    return null
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key') as any
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        foodPreference: true,
        totalKitchenTurns: true,
        leaveDays: true,
        discordId: true,
        rotationPosition: true,
        lastTurnDate: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    return user
  } catch (error) {
    return null
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN', 'FC'])
  if (!auth.user) return auth.response
  try {
    const body = await request.json()
    const { date, breakfast, lunch, snacks, dinner, mainDish, dishType } = updateFoodMenuSchema.parse(body)

    // Get current user from JWT token
    const currentUser = await getCurrentUser(request)
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has permission to update menu
    if (!['ADMIN', 'FC'].includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only ADMIN and FC roles can update menus.' },
        { status: 403 }
      )
    }

    // Check if at least one meal is provided
    if (!breakfast && !lunch && !snacks && !dinner) {
      return NextResponse.json(
        { message: 'At least one meal must be provided' },
        { status: 400 }
      )
    }

    // Check if menu already exists for this date
    const existingMenu = await db.foodMenu.findFirst({
      where: {
        date: date
      }
    })

    let foodMenu
    if (existingMenu) {
      // Check if current user is the one who can update this menu
      // For FC role, they can handle their post but if they give it to someone else, they lose FC privileges
      if (existingMenu.updatedBy !== currentUser.id && currentUser.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'You can only update menus that you have created or been assigned to' },
          { status: 403 }
        )
      }

      // Update existing menu
      foodMenu = await db.foodMenu.update({
        where: {
          id: existingMenu.id
        },
        data: {
          breakfast: breakfast || existingMenu.breakfast,
          lunch: lunch || existingMenu.lunch,
          snacks: snacks || existingMenu.snacks,
          dinner: dinner || existingMenu.dinner,
          mainDish: mainDish || existingMenu.mainDish,
          dishType: dishType || existingMenu.dishType,
          updatedAt: new Date(),
          updatedBy: currentUser.id
        }
      })
    } else {
      // Create new menu
      foodMenu = await db.foodMenu.create({
        data: {
          date: date,
          breakfast: breakfast || '',
          lunch: lunch || '',
          snacks: snacks || '',
          dinner: dinner || '',
          mainDish: mainDish || '',
          dishType: dishType || 'VEG',
          updatedBy: currentUser.id
        }
      })
    }

    return NextResponse.json(foodMenu)
  } catch (error) {
    console.error('Error updating food menu:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid input', errors: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}