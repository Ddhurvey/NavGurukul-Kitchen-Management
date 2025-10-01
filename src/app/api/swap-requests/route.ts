import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const swapRequests = await db.swapRequest.findMany({
      include: {
        requester: true,
        approver: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(swapRequests)
  } catch (error) {
    console.error('Error fetching swap requests:', error)
    return NextResponse.json({ error: 'Failed to fetch swap requests' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { requesterId, approverId, originalDate, swapDate, reason } = data

    const swapRequest = await db.swapRequest.create({
      data: {
        requesterId,
        approverId,
        originalDate: new Date(originalDate),
        swapDate: new Date(swapDate),
        reason
      },
      include: {
        requester: true,
        approver: true
      }
    })

    return NextResponse.json(swapRequest, { status: 201 })
  } catch (error) {
    console.error('Error creating swap request:', error)
    return NextResponse.json({ error: 'Failed to create swap request' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const { id, status } = data

    const swapRequest = await db.swapRequest.update({
      where: { id },
      data: { status },
      include: {
        requester: true,
        approver: true
      }
    })

    // If approved, update the kitchen duty assignments
    if (status === 'approved') {
      // This would involve swapping the assignments in the kitchen duty
      // Implementation would depend on the specific requirements
    }

    return NextResponse.json(swapRequest)
  } catch (error) {
    console.error('Error updating swap request:', error)
    return NextResponse.json({ error: 'Failed to update swap request' }, { status: 500 })
  }
}