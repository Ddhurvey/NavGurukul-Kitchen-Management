import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // This endpoint would be called by a cron job daily at a specific time
    // For now, we'll trigger the Discord notification
    const discordResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/discord/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'daily' })
    })

    if (!discordResponse.ok) {
      const errorData = await discordResponse.json()
      throw new Error(`Discord notification failed: ${errorData.error}`)
    }

    const result = await discordResponse.json()

    // Log the scheduled notification
    await db.historyLog.create({
      data: {
        action: 'DAILY_DISCORD_NOTIFICATION_SENT',
        updatedBy: 'SYSTEM',
        metadata: JSON.stringify({
          timestamp: new Date().toISOString(),
          result: result.data
        })
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Daily notification sent successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in daily scheduled notification:', error)
    
    // Log the error
    await db.historyLog.create({
      data: {
        action: 'DAILY_NOTIFICATION_FAILED',
        updatedBy: 'SYSTEM',
        metadata: JSON.stringify({
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })

    return NextResponse.json(
      { error: 'Failed to send daily notification' },
      { status: 500 }
    )
  }
}

// Manual trigger for testing
export async function GET() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/discord/notify`)
    const result = await response.json()

    return NextResponse.json({ 
      success: true, 
      message: 'Manual daily notification triggered',
      result
    })
  } catch (error) {
    console.error('Error triggering manual notification:', error)
    return NextResponse.json(
      { error: 'Failed to trigger manual notification' },
      { status: 500 }
    )
  }
}