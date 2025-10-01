import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1422903085680033853/mVeuOQhZk7ocLABZG1fTPcNWf4I5rx98gvRYkjSPZx27rzgkdQamXJIPOW7fJLV5nCPF'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { date } = data

    // Get the date for notification
    const targetDate = date ? new Date(date) : new Date()
    targetDate.setDate(targetDate.getDate() + 1)
    targetDate.setHours(0, 0, 0, 0)

    // Find kitchen duty for the target date
    const kitchenDuty = await db.kitchenDuty.findUnique({
      where: { date: targetDate },
      include: {
        teamLead: true,
        assignments: {
          include: {
            student: true
          }
        }
      }
    })

    if (!kitchenDuty) {
      return NextResponse.json({
        success: false,
        message: 'No kitchen duty assigned for the specified date'
      }, { status: 404 })
    }

    // Format the notification message
    const teamLead = kitchenDuty.assignments.find(a => a.isTeamLead)?.student
    const teamMembers = kitchenDuty.assignments.filter(a => !a.isTeamLead).map(a => a.student)

    const message = `🍳 **Kitchen Duty Alert** 🍳

**Date:** ${targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}

**Team Lead:** ${teamLead?.name || 'Not assigned'}

**Team Members:**
${teamMembers.map(member => `• ${member.name} (${member.foodPreference})`).join('\n')}

**Important:**
• Please be ready by 7:00 AM
• Team lead should coordinate with all members
• Follow the kitchen duty guidelines

Good luck with your kitchen duty! 🎉`

    // Send to Discord webhook
    const discordPayload = {
      content: message,
      username: 'Kitchen Duty Bot',
      avatar_url: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png' // Chef hat icon
    }

    const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(discordPayload)
    })

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text()
      console.error('Discord API Error:', errorText)
      throw new Error(`Discord webhook failed: ${discordResponse.status} ${errorText}`)
    }

    console.log('Discord notification sent successfully!')
    
    // Store notification in database for tracking
    await db.notification.create({
      data: {
        type: 'DISCORD_KITCHEN_DUTY',
        message,
        targetDate,
        recipientIds: JSON.stringify(kitchenDuty.assignments.map(a => a.studentId))
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Discord notification sent successfully',
      notification: {
        date: targetDate.toLocaleDateString(),
        teamLead: teamLead?.name,
        teamMembers: teamMembers.map(m => m.name),
        message
      }
    })

  } catch (error) {
    console.error('Error sending Discord notification:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send Discord notification' 
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Get recent notifications
    const notifications = await db.notification.findMany({
      orderBy: { sentAt: 'desc' },
      take: 10
    })

    return NextResponse.json({
      notifications,
      total: notifications.length
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}