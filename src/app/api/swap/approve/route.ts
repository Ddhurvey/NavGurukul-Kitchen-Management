import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendDiscordNotification } from '@/lib/discord'
import { requireRole } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN', 'FC'])
  if (!auth.user) return auth.response
  try {
    const { swapRequestId, comments } = await request.json()
    const approvedBy = auth.user.id
    
    if (!swapRequestId || !approvedBy) {
      return NextResponse.json(
        { error: 'Swap request ID and approver ID are required' },
        { status: 400 }
      )
    }

    // Get the swap request
    const swapRequest = await db.exchangeRequest.findUnique({
      where: { id: swapRequestId },
      include: {
        fromStudent: true,
        toStudent: true,
        kitchenTurn: true
      }
    })

    if (!swapRequest) {
      return NextResponse.json(
        { error: 'Swap request not found' },
        { status: 404 }
      )
    }

    if (swapRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Swap request is not pending' },
        { status: 400 }
      )
    }

    // Check if it's past 9 PM for the assignment
    const turnDate = new Date(swapRequest.kitchenTurn.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const now = new Date()
    const ninePM = new Date()
    ninePM.setHours(21, 0, 0, 0)
    
    const isPast9PM = now > ninePM
    const isToday = turnDate.getTime() === today.getTime()

    // Can't approve swaps after 9 PM for today's duty
    if (isToday && isPast9PM) {
      return NextResponse.json(
        { error: 'Cannot approve swap requests after 9 PM for today\'s kitchen duty' },
        { status: 400 }
      )
    }

    // Update swap request status
    const updatedSwapRequest = await db.exchangeRequest.update({
      where: { id: swapRequestId },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
        comments
      }
    })

    // Execute the swap
    await executeSwap(swapRequest, auth.user.id)

    // Log the approval
    await db.historyLog.create({
      data: {
        action: 'SWAP_APPROVED',
        updatedBy: approvedBy,
        metadata: JSON.stringify({
          swapRequestId,
          fromStudentId: swapRequest.fromStudentId,
          toStudentId: swapRequest.toStudentId,
          kitchenTurnId: swapRequest.kitchenTurnId,
          turnDate: swapRequest.kitchenTurn.date,
          reason: swapRequest.reason,
          swapReason: swapRequest.swapReason,
          approvedBy,
          comments,
          isPast9PM,
          immediateExecution: !isToday || !isPast9PM
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Swap request approved and executed successfully',
      swapRequest: updatedSwapRequest,
      immediateExecution: !isToday || !isPast9PM
    })

  } catch (error) {
    console.error('Error approving swap request:', error)
    return NextResponse.json(
      { error: 'Failed to approve swap request' },
      { status: 500 }
    )
  }
}

async function executeSwap(swapRequest: any, actorId: string) {
  try {
    const { fromStudentId, toStudentId, kitchenTurnId } = swapRequest

    // Remove the original student assignment
    await db.kitchenTurnStudent.deleteMany({
      where: {
        kitchenTurnId,
        studentId: fromStudentId
      }
    })

    // Add the new student assignment
    await db.kitchenTurnStudent.create({
      data: {
        kitchenTurnId,
        studentId: toStudentId
      }
    })

    // Update rotation data for both students
    await Promise.all([
      db.user.update({
        where: { id: fromStudentId },
        data: {
          totalKitchenTurns: { decrement: 1 },
          lastTurnDate: null
        }
      }),
      db.user.update({
        where: { id: toStudentId },
        data: {
          totalKitchenTurns: { increment: 1 },
          lastTurnDate: new Date(swapRequest.kitchenTurn.date)
        }
      })
    ])

    // Send Discord notification about the swap
    await sendSwapExecutionNotification(swapRequest)

    // Log the swap execution
    await db.historyLog.create({
      data: {
        action: 'SWAP_EXECUTED',
        updatedBy: actorId,
        metadata: JSON.stringify({
          swapRequestId: swapRequest.id,
          fromStudentId,
          toStudentId,
          kitchenTurnId,
          turnDate: swapRequest.kitchenTurn.date,
          executedAt: new Date().toISOString()
        })
      }
    })

  } catch (error) {
    console.error('Error executing swap:', error)
    throw error
  }
}

async function sendSwapExecutionNotification(swapRequest: any) {
  try {
    const message = `Kitchen Duty Swap Approved\n\n` +
      `Date:- ${new Date(swapRequest.kitchenTurn.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n` +
      `Original Student:- @${swapRequest.fromStudent.name.replace(/\s+/g, '-')}- ( ${swapRequest.fromStudent.foodPreference || 'GENERAL'} )\n` +
      `New Student:- @${swapRequest.toStudent.name.replace(/\s+/g, '-')}- ( ${swapRequest.toStudent.foodPreference || 'GENERAL'} )\n` +
      `Reason:- ${swapRequest.reason}\n` +
      `Swap Type:- ${swapRequest.swapReason.replace('_', ' ')}\n` +
      `Status:- Swap executed successfully\n\n` +
      `@Dharamshala Student (current)\n` +
      `Regards (F.C)`
    
    await sendDiscordNotification(message)
  } catch (error) {
    console.error('Error sending swap execution notification:', error)
  }
}