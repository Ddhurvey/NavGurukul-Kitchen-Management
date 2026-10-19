import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { requireRole } from '@/lib/auth'

const transferMenuSchema = z.object({
  menuId: z.string().min(1, 'Menu ID is required'),
  newUserId: z.string().min(1, 'New user ID is required')
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
    const { menuId, newUserId } = transferMenuSchema.parse(body)

    // Get current user from JWT token
    const currentUser = await getCurrentUser(request)
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only FC users can transfer their menu responsibilities
    if (currentUser.role !== 'FC') {
      return NextResponse.json(
        { error: 'Only FC users can transfer menu responsibilities' },
        { status: 403 }
      )
    }

    // Get the menu to transfer
    const menu = await db.foodMenu.findUnique({
      where: { id: menuId }
    })

    if (!menu) {
      return NextResponse.json(
        { error: 'Menu not found' },
        { status: 404 }
      )
    }

    // Check if current user owns this menu
    if (menu.updatedBy !== currentUser.id) {
      return NextResponse.json(
        { error: 'You can only transfer menus that you are responsible for' },
        { status: 403 }
      )
    }

    // Get the new user
    const newUser = await db.user.findUnique({
      where: { id: newUserId }
    })

    if (!newUser) {
      return NextResponse.json(
        { error: 'New user not found' },
        { status: 404 }
      )
    }

    // Update the menu with new user
    const updatedMenu = await db.foodMenu.update({
      where: { id: menuId },
      data: {
        updatedBy: newUserId,
        updatedAt: new Date()
      }
    })

    // Optionally, you could update the FC role to the new user
    // This depends on your business logic
    // await db.user.update({
    //   where: { id: newUserId },
    //   data: { role: 'FC' }
    // })

    return NextResponse.json({
      message: 'Menu responsibility transferred successfully',
      menu: updatedMenu
    })

  } catch (error) {
    console.error('Error transferring menu:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', errors: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}