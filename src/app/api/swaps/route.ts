import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const swaps = await db.dutySwap.findMany({
      include: {
        requester: {
          select: { id: true, name: true, discordId: true }
        },
        target: {
          select: { id: true, name: true, discordId: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    return NextResponse.json(swaps)
  } catch (error) {
    console.error('Error fetching swaps:', error)
    return NextResponse.json({ error: 'Failed to fetch swaps' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const swap = await db.dutySwap.create({
      data: {
        requesterId: data.requesterId,
        targetId: data.targetId,
        dutyDate: new Date(data.dutyDate),
        reason: data.reason
      },
      include: {
        requester: {
          select: { id: true, name: true, discordId: true }
        },
        target: {
          select: { id: true, name: true, discordId: true }
        }
      }
    })

    // Send Discord notification for new swap request
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/discord/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'swap',
          id: swap.id
        })
      })
    } catch (notificationError) {
      console.error('Failed to send Discord notification for swap creation:', notificationError)
      // Don't fail the request if notification fails
    }

    return NextResponse.json(swap, { status: 201 })
  } catch (error) {
    console.error('Error creating swap:', error)
    return NextResponse.json({ error: 'Failed to create swap' }, { status: 500 })
  }
}