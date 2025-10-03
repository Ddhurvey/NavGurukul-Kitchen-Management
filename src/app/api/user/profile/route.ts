import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { name, email, foodPreference, discordId } = await request.json()

    // Validate input
    if (!name || !email || !foodPreference) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate food preference
    const validPreferences = ['PANEER', 'EGGS']
    if (!validPreferences.includes(foodPreference)) {
      return NextResponse.json({ error: 'Invalid food preference' }, { status: 400 })
    }

    // Check if email is already taken by another user
    const existingUser = await db.user.findFirst({
      where: {
        email,
        id: { not: decoded.userId }
      }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email already taken' }, { status: 400 })
    }

    // Update user profile
    const updatedUser = await db.user.update({
      where: { id: decoded.userId },
      data: {
        name,
        email,
        foodPreference,
        discordId: discordId || null
      }
    })

    return NextResponse.json({ 
      message: 'Profile updated successfully',
      user: updatedUser 
    })

  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      include: {
        leaves: {
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        leaveRequests: {
          orderBy: { requestTime: 'desc' },
          take: 20
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })

  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}