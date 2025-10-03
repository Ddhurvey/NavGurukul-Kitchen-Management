import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const swapRequestSchema = z.object({
  fromStudentId: z.string(),
  toStudentId: z.string(),
  kitchenTurnId: z.string(),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
  swapReason: z.enum(['HEALTH_ISSUE', 'LEAVE', 'PERSONAL_WORK', 'FAMILY_EMERGENCY', 'MEDICAL_APPOINTMENT', 'OTHER'])
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = swapRequestSchema.parse(body)

    // Check if both students exist and are active
    const [fromStudent, toStudent] = await Promise.all([
      db.user.findUnique({
        where: { id: validatedData.fromStudentId }
      }),
      db.user.findUnique({
        where: { id: validatedData.toStudentId }
      })
    ])

    if (!fromStudent || !toStudent) {
      return NextResponse.json(
        { error: 'One or both students not found' },
        { status: 404 }
      )
    }

    if (fromStudent.status !== 'ACTIVE' || toStudent.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Both students must be active to request a swap' },
        { status: 400 }
      )
    }

    // Check if kitchen turn exists and student is assigned
    const kitchenTurnStudent = await db.kitchenTurnStudent.findUnique({
      where: {
        kitchenTurnId_studentId: {
          kitchenTurnId: validatedData.kitchenTurnId,
          studentId: validatedData.fromStudentId
        }
      },
      include: {
        kitchenTurn: true
      }
    })

    if (!kitchenTurnStudent) {
      return NextResponse.json(
        { error: 'Student is not assigned to this kitchen turn' },
        { status: 400 }
      )
    }

    // Check if kitchen turn is in the future (can't swap past duties)
    const turnDate = new Date(kitchenTurnStudent.kitchenTurn.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (turnDate < today) {
      return NextResponse.json(
        { error: 'Cannot swap past kitchen duties' },
        { status: 400 }
      )
    }

    // Check if it's past 9 PM for today's duty (can't swap after 9 PM)
    if (turnDate.getTime() === today.getTime()) {
      const now = new Date()
      const cutoffTime = new Date()
      cutoffTime.setHours(21, 0, 0, 0) // 9:00 PM
      
      if (now > cutoffTime) {
        return NextResponse.json(
          { error: 'Cannot swap kitchen duties after 9:00 PM for today' },
          { status: 400 }
        )
      }
    }

    // Check if target student is available on that date (not on leave)
    const existingLeave = await db.leave.findFirst({
      where: {
        studentId: validatedData.toStudentId,
        status: 'APPROVED',
        startDate: {
          lte: turnDate
        },
        endDate: {
          gte: turnDate
        }
      }
    })

    if (existingLeave) {
      return NextResponse.json(
        { error: 'Target student is on leave during this period' },
        { status: 400 }
      )
    }

    // Check if there's already a pending swap request for this turn
    const existingSwap = await db.exchangeRequest.findFirst({
      where: {
        kitchenTurnId: validatedData.kitchenTurnId,
        fromStudentId: validatedData.fromStudentId,
        status: 'PENDING'
      }
    })

    if (existingSwap) {
      return NextResponse.json(
        { error: 'There is already a pending swap request for this kitchen turn' },
        { status: 400 }
      )
    }

    // Create the swap request
    const swapRequest = await db.exchangeRequest.create({
      data: {
        fromStudentId: validatedData.fromStudentId,
        toStudentId: validatedData.toStudentId,
        kitchenTurnId: validatedData.kitchenTurnId,
        reason: validatedData.reason,
        swapReason: validatedData.swapReason,
        status: 'PENDING'
      },
      include: {
        fromStudent: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        toStudent: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        kitchenTurn: {
          select: {
            id: true,
            date: true,
            status: true
          }
        }
      }
    })

    // Log the swap request
    await db.historyLog.create({
      data: {
        action: 'SWAP_REQUEST_CREATED',
        updatedBy: validatedData.fromStudentId,
        metadata: JSON.stringify({
          swapRequestId: swapRequest.id,
          fromStudentId: validatedData.fromStudentId,
          toStudentId: validatedData.toStudentId,
          kitchenTurnId: validatedData.kitchenTurnId,
          reason: validatedData.reason,
          swapReason: validatedData.swapReason,
          turnDate: kitchenTurnStudent.kitchenTurn.date
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Swap request submitted successfully',
      swapRequest
    })

  } catch (error) {
    console.error('Error creating swap request:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create swap request' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const status = searchParams.get('status')

    let whereClause: any = {}

    if (studentId) {
      whereClause.OR = [
        { fromStudentId: studentId },
        { toStudentId: studentId }
      ]
    }

    if (status) {
      whereClause.status = status
    }

    const swapRequests = await db.exchangeRequest.findMany({
      where: whereClause,
      include: {
        fromStudent: {
          select: {
            id: true,
            name: true,
            email: true,
            foodPreference: true
          }
        },
        toStudent: {
          select: {
            id: true,
            name: true,
            email: true,
            foodPreference: true
          }
        },
        kitchenTurn: {
          select: {
            id: true,
            date: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      swapRequests
    })

  } catch (error) {
    console.error('Error fetching swap requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch swap requests' },
      { status: 500 }
    )
  }
}