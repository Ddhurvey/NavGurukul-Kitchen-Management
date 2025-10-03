import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['STUDENT', 'FC', 'TEAM_MEMBER', 'ADMIN']).default('STUDENT'),
  foodPreference: z.enum(['PANEER', 'EGGS']).default('PANEER')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = registerSchema.parse(body)
    
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email }
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)
    
    // Create user
    const user = await db.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: validatedData.role,
        foodPreference: validatedData.foodPreference,
        status: 'ACTIVE',
        totalKitchenTurns: 0,
        leaveDays: 0,
        rotationPosition: 0
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        foodPreference: true,
        totalKitchenTurns: true,
        leaveDays: true,
        createdAt: true
      }
    })
    
    // Check if this is the first user and initialize rotation if needed
    const activeStudentsCount = await db.user.count({
      where: {
        status: 'ACTIVE',
        role: 'STUDENT'
      }
    })
    
    if (activeStudentsCount === 1 && user.role === 'STUDENT') {
      // This is the first student user - initialize rotation system
      const { getIndiaToday } = await import('@/lib/time')
      const today = getIndiaToday()
      
      // Create initial rotation cycle
      const initialCycle = await db.rotationCycle.create({
        data: {
          cycleNumber: 1,
          startDate: today,
          totalDays: 7,
          isActive: true
        }
      })
      
      // Initialize user's rotation position
      await db.user.update({
        where: { id: user.id },
        data: {
          rotationPosition: 0
        }
      })
      
      // Add user to rotation cycle
      await db.rotationCycleStudent.create({
        data: {
          cycleId: initialCycle.id,
          studentId: user.id,
          position: 0,
          turnsCompleted: 0,
          lastAssignedDate: null
        }
      })
      
      // Assign first duty to this user
      const kitchenTurn = await db.kitchenTurn.create({
        data: {
          date: today,
          status: 'PENDING',
          teamLeaderId: user.id,
          cycleId: initialCycle.id,
          menuBasedAssignment: false,
          isLocked: false
        }
      })
      
      await db.kitchenTurnStudent.create({
        data: {
          kitchenTurnId: kitchenTurn.id,
          studentId: user.id
        }
      })
      
      // Update user's first duty info
      await db.user.update({
        where: { id: user.id },
        data: {
          totalKitchenTurns: 1,
          lastTurnDate: today
        }
      })
      
      // Update rotation cycle student
      await db.rotationCycleStudent.update({
        where: {
          cycleId_studentId: {
            cycleId: initialCycle.id,
            studentId: user.id
          }
        },
        data: {
          turnsCompleted: 1,
          lastAssignedDate: today
        }
      })
      
      // Create default food menu for today
      await db.foodMenu.create({
        data: {
          date: today,
          breakfast: 'Poha',
          lunch: 'Dal + Rice',
          snacks: 'Samosa',
          dinner: 'Veg + Roti',
          updatedBy: user.id
        }
      })
      
      // Log the initialization
      await db.historyLog.create({
        data: {
          action: 'USER_REGISTERED_AND_ROTATION_INITIALIZED',
          updatedBy: user.id,
          metadata: JSON.stringify({
            userId: user.id,
            userName: user.name,
            cycleId: initialCycle.id,
            registrationTime: new Date().toISOString()
          })
        }
      })
    } else {
      // Log regular registration
      await db.historyLog.create({
        data: {
          action: 'USER_REGISTERED',
          updatedBy: user.id,
          metadata: JSON.stringify({
            userId: user.id,
            userName: user.name,
            registrationTime: new Date().toISOString()
          })
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      user
    })
    
  } catch (error) {
    console.error('Registration error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    )
  }
}