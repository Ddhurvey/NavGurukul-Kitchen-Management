import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { action, userId } = await request.json()
    
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const swap = await db.dutySwap.findUnique({
      where: { id: params.id },
      include: {
        requester: { select: { id: true, name: true, discordId: true } },
        target: { select: { id: true, name: true, discordId: true } }
      }
    })

    if (!swap) {
      return NextResponse.json({ error: 'Swap not found' }, { status: 404 })
    }

    if (swap.status !== 'PENDING') {
      return NextResponse.json({ error: 'Swap is not pending' }, { status: 400 })
    }

    let updateData: any = {}

    if (action === 'approve') {
      // Check if user is the requester or target
      if (userId === swap.requesterId) {
        updateData.requesterApproved = true
      } else if (userId === swap.targetId) {
        updateData.targetApproved = true
      } else {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      // If both approved, update the duty assignment
      if (swap.requesterApproved || userId === swap.requesterId) {
        if (swap.targetApproved || userId === swap.targetId) {
          updateData.status = 'APPROVED'
          
          // Find the kitchen duty for this date
          const duty = await db.kitchenDuty.findFirst({
            where: { date: swap.dutyDate }
          })

          if (duty) {
            // Swap the student in the duty
            const updatedDuty = await db.kitchenDuty.update({
              where: { id: duty.id },
              data: {
                teamLeaderId: duty.teamLeaderId === swap.requesterId ? swap.targetId : 
                              duty.teamLeaderId === swap.targetId ? swap.requesterId : 
                              duty.teamLeaderId,
                member2Id: duty.member2Id === swap.requesterId ? swap.targetId : 
                           duty.member2Id === swap.targetId ? swap.requesterId : 
                           duty.member2Id,
                member3Id: duty.member3Id === swap.requesterId ? swap.targetId : 
                           duty.member3Id === swap.targetId ? swap.requesterId : 
                           duty.member3Id,
                member4Id: duty.member4Id === swap.requesterId ? swap.targetId : 
                           duty.member4Id === swap.targetId ? swap.requesterId : 
                           duty.member4Id,
              }
            })
          }
        }
      }
    } else if (action === 'reject') {
      updateData.status = 'REJECTED'
    }

    const updatedSwap = await db.dutySwap.update({
      where: { id: params.id },
      data: updateData,
      include: {
        requester: { select: { id: true, name: true, discordId: true } },
        target: { select: { id: true, name: true, discordId: true } }
      }
    })

    // Send Discord notification for swap status update
    try {
      const action = updateData.status === 'APPROVED' ? 'approved' : 
                    updateData.status === 'REJECTED' ? 'rejected' : null
      
      if (action) {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/discord/notify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'swap',
            id: params.id,
            action: action
          })
        })
      }
    } catch (notificationError) {
      console.error('Failed to send Discord notification for swap update:', notificationError)
      // Don't fail the request if notification fails
    }

    return NextResponse.json(updatedSwap)
  } catch (error) {
    console.error('Error updating swap:', error)
    return NextResponse.json({ error: 'Failed to update swap' }, { status: 500 })
  }
}