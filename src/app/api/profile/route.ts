import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

// Validation schemas
const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  contact: z.string().optional(),
})

const updateFoodPreferenceSchema = z.object({
  foodPreference: z.enum(['EGGS', 'PANEER'])
})

const leaveRequestSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  isEmergency: z.boolean().default(false)
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get user profile with comprehensive data
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        foodPreference: true,
        totalKitchenTurns: true,
        leaveDays: true,
        rotationPosition: true,
        lastTurnDate: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get kitchen duty history
    const kitchenHistory = await db.kitchenTurnStudent.findMany({
      where: { studentId: userId },
      include: {
        kitchenTurn: {
          select: {
            id: true,
            date: true,
            status: true,
            teamLeaderId: true
          }
        }
      },
      orderBy: {
        kitchenTurn: {
          date: 'desc'
        }
      },
      take: 20
    })

    // Get leave history
    const leaveHistory = await db.leave.findMany({
      where: { studentId: userId },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    // Get role history
    const roleHistory = await db.userRoleHistory.findMany({
      where: { studentId: userId },
      orderBy: {
        startDate: 'desc'
      },
      take: 10
    })

    // Get current active leave
    const currentLeave = await db.leave.findFirst({
      where: {
        studentId: userId,
        status: 'APPROVED',
        startDate: {
          lte: new Date()
        },
        endDate: {
          gte: new Date()
        }
      }
    })

    // Check if user can edit profile
    const canEdit = user.status === 'ACTIVE'

    return NextResponse.json({
      user,
      kitchenHistory,
      leaveHistory,
      roleHistory,
      currentLeave,
      canEdit,
      statistics: {
        totalKitchenTurns: user.totalKitchenTurns,
        totalLeaveDays: user.leaveDays,
        upcomingDuties: kitchenHistory.filter(kh => 
          new Date(kh.kitchenTurn.date) > new Date()
        ).length,
        completedDuties: kitchenHistory.filter(kh => 
          kh.kitchenTurn.status === 'DONE'
        ).length
      }
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile data' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get current user data
    const currentUser = await db.user.findUnique({
      where: { id: userId }
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user can edit profile
    if (currentUser.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot edit profile: User is not active' },
        { status: 403 }
      )
    }

    let updateData: any = {}
    let historyAction = ''

    switch (action) {
      case 'update_profile':
        const profileData = await request.json()
        const validatedProfile = updateProfileSchema.parse(profileData)
        
        updateData = {
          name: validatedProfile.name,
          email: validatedProfile.email,
          updatedAt: new Date()
        }
        
        historyAction = 'PROFILE_UPDATED'
        break

      case 'update_food_preference':
        const foodData = await request.json()
        const validatedFood = updateFoodPreferenceSchema.parse(foodData)
        
        updateData = {
          foodPreference: validatedFood.foodPreference,
          updatedAt: new Date()
        }
        
        historyAction = 'FOOD_PREFERENCE_UPDATED'
        break

      case 'request_leave':
        const leaveData = await request.json()
        const validatedLeave = leaveRequestSchema.parse(leaveData)
        
        // Check for overlapping leaves
        const overlappingLeave = await db.leave.findFirst({
          where: {
            studentId: userId,
            status: 'APPROVED',
            OR: [
              {
                startDate: {
                  lte: new Date(validatedLeave.startDate)
                },
                endDate: {
                  gte: new Date(validatedLeave.startDate)
                }
              },
              {
                startDate: {
                  lte: new Date(validatedLeave.endDate)
                },
                endDate: {
                  gte: new Date(validatedLeave.endDate)
                }
              }
            ]
          }
        })

        if (overlappingLeave) {
          return NextResponse.json(
            { error: 'Leave request overlaps with existing approved leave' },
            { status: 400 }
          )
        }

        // Create leave request
        const leave = await db.leave.create({
          data: {
            studentId: userId,
            reason: validatedLeave.reason,
            startDate: new Date(validatedLeave.startDate),
            endDate: new Date(validatedLeave.endDate),
            isEmergency: validatedLeave.isEmergency,
            status: 'PENDING'
          }
        })

        // Log leave request
        await db.historyLog.create({
          data: {
            action: 'LEAVE_REQUEST_CREATED',
            updatedBy: userId,
            metadata: JSON.stringify({
              leaveId: leave.id,
              reason: validatedLeave.reason,
              startDate: validatedLeave.startDate,
              endDate: validatedLeave.endDate,
              isEmergency: validatedLeave.isEmergency
            })
          }
        })

        return NextResponse.json({
          success: true,
          message: 'Leave request submitted successfully',
          leave
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Update user profile
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        foodPreference: true,
        totalKitchenTurns: true,
        leaveDays: true,
        updatedAt: true
      }
    })

    // Log the change
    await db.historyLog.create({
      data: {
        action: historyAction,
        updatedBy: userId,
        metadata: JSON.stringify({
          previousData: {
            name: currentUser.name,
            email: currentUser.email,
            foodPreference: currentUser.foodPreference
          },
          newData: updateData,
          updatedAt: new Date()
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Error updating profile:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}