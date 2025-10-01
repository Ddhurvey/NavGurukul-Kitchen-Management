import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json()

    if (!type) {
      return NextResponse.json({ error: 'Type is required' }, { status: 400 })
    }

    let notificationData: any = {}

    switch (type) {
      case 'swap':
        notificationData = {
          type: 'swap',
          id: 'test-swap-id'
        }
        break
      case 'swap-approved':
        notificationData = {
          type: 'swap',
          id: 'test-swap-id',
          action: 'approved'
        }
        break
      case 'swap-rejected':
        notificationData = {
          type: 'swap',
          id: 'test-swap-id',
          action: 'rejected'
        }
        break
      case 'student-status':
        notificationData = {
          type: 'student',
          id: 'test-student-id',
          oldStatus: 'ACTIVE',
          newStatus: 'LEAVE',
          reason: 'Test leave notification'
        }
        break
      default:
        return NextResponse.json({ error: 'Invalid test type' }, { status: 400 })
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/discord/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notificationData)
    })

    if (response.ok) {
      const result = await response.json()
      return NextResponse.json({ 
        message: `Test ${type} notification sent successfully`,
        result 
      })
    } else {
      const error = await response.json()
      return NextResponse.json({ 
        error: `Failed to send test notification: ${error.error}` 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in test notification:', error)
    return NextResponse.json({ 
      error: 'Failed to send test notification' 
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Discord Notification Test Endpoint',
    usage: {
      'POST /api/test-discord': {
        'swap': 'Test swap request notification',
        'swap-approved': 'Test swap approval notification',
        'swap-rejected': 'Test swap rejection notification',
        'student-status': 'Test student status change notification'
      }
    }
  })
}