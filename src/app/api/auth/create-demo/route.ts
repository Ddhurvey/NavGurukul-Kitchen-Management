import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST() {
  if (process.env.NODE_ENV === 'production' || process.env.DEMO_SETUP_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Demo account setup is disabled' }, { status: 404 })
  }
  try {
    // Check if demo user already exists
    const existingDemoUser = await db.user.findUnique({
      where: { email: 'demo@navgurukul.org' }
    })

    if (existingDemoUser) {
      return NextResponse.json({
        success: true,
        message: 'Demo user already exists',
        user: {
          id: existingDemoUser.id,
          name: existingDemoUser.name,
          email: existingDemoUser.email,
          role: existingDemoUser.role
        }
      })
    }

    // Create demo user
    const hashedPassword = await bcrypt.hash('demo123', 12)
    
    const demoUser = await db.user.create({
      data: {
        name: 'Demo Student',
        email: 'demo@navgurukul.org',
        password: hashedPassword,
        role: 'STUDENT',
        foodPreference: 'PANEER',
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
    
    if (activeStudentsCount === 1) {
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
        where: { id: demoUser.id },
        data: {
          rotationPosition: 0
        }
      })
      
      // Add user to rotation cycle
      await db.rotationCycleStudent.create({
        data: {
          cycleId: initialCycle.id,
          studentId: demoUser.id,
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
          teamLeaderId: demoUser.id,
          cycleId: initialCycle.id,
          menuBasedAssignment: false,
          isLocked: false
        }
      })
      
      await db.kitchenTurnStudent.create({
        data: {
          kitchenTurnId: kitchenTurn.id,
          studentId: demoUser.id
        }
      })
      
      // Update user's first duty info
      await db.user.update({
        where: { id: demoUser.id },
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
            studentId: demoUser.id
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
          updatedBy: demoUser.id
        }
      })
      
      // Log the initialization
      await db.historyLog.create({
        data: {
          action: 'DEMO_USER_CREATED_AND_ROTATION_INITIALIZED',
          updatedBy: demoUser.id,
          metadata: JSON.stringify({
            userId: demoUser.id,
            userName: demoUser.name,
            cycleId: initialCycle.id,
            creationTime: new Date().toISOString()
          })
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Demo user created successfully',
      user: demoUser
    })

  } catch (error) {
    console.error('Demo user creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create demo user' },
      { status: 500 }
    )
  }
}