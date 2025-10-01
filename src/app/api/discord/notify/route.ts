import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

interface DiscordMessage {
  content: string
  embeds?: Array<{
    title: string
    description: string
    color: number
    fields?: Array<{
      name: string
      value: string
      inline: boolean
    }>
  }>
}

async function sendDiscordNotification(message: DiscordMessage) {
  try {
    // In a real implementation, you would use Discord's webhook URL
    // For now, we'll simulate the notification using ZAI SDK
    const zai = await ZAI.create()
    
    // Simulate sending Discord notification
    console.log('Discord Notification:', JSON.stringify(message, null, 2))
    
    // In production, you would make an actual webhook call:
    // const response = await fetch(process.env.DISCORD_WEBHOOK_URL, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(message)
    // })
    
    return { success: true, message: 'Notification sent successfully' }
  } catch (error) {
    console.error('Error sending Discord notification:', error)
    throw error
  }
}

function formatDutyMessage(duty: any): DiscordMessage {
  const date = new Date(duty.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const teamLeaderMention = duty.teamLeader.discordId ? `<@${duty.teamLeader.discordId}>` : duty.teamLeader.name
  const member2Mention = duty.member2.discordId ? `<@${duty.member2.discordId}>` : duty.member2.name
  const member3Mention = duty.member3.discordId ? `<@${duty.member3.discordId}>` : duty.member3.name
  const member4Mention = duty.member4.discordId ? `<@${duty.member4.discordId}>` : duty.member4.name

  return {
    content: `📢 **Kitchen Duty for ${date}**`,
    embeds: [{
      title: 'Today\'s Kitchen Team',
      description: 'Please ensure you arrive on time for your duty!',
      color: 0x00ff00,
      fields: [
        {
          name: '👤 Team Leader',
          value: teamLeaderMention,
          inline: false
        },
        {
          name: '👥 Team Members',
          value: `${member2Mention}\n${member3Mention}\n${member4Mention}`,
          inline: false
        },
        {
          name: '🍴 Menu',
          value: `**Breakfast:** ${duty.breakfast}\n**Lunch:** ${duty.lunch}\n**Snacks:** ${duty.snacks}\n**Dinner:** ${duty.dinner}`,
          inline: false
        }
      ]
    }]
  }
}

function formatSwapMessage(swap: any): DiscordMessage {
  const requesterMention = swap.requester.discordId ? `<@${swap.requester.discordId}>` : swap.requester.name
  const targetMention = swap.target.discordId ? `<@${swap.target.discordId}>` : swap.target.name

  return {
    content: `🔄 **Duty Swap Request**`,
    embeds: [{
      title: 'Swap Request Pending',
      description: `${requesterMention} wants to swap duty with ${targetMention}`,
      color: 0xffff00,
      fields: [
        {
          name: '📅 Date',
          value: new Date(swap.dutyDate).toLocaleDateString(),
          inline: true
        },
        {
          name: '📝 Reason',
          value: swap.reason,
          inline: false
        },
        {
          name: '✅ Status',
          value: `Requester: ${swap.requesterApproved ? '✅' : '⏳'}\nTarget: ${swap.targetApproved ? '✅' : '⏳'}`,
          inline: true
        }
      ]
    }]
  }
}

function formatSwapStatusMessage(swap: any, action: 'approved' | 'rejected'): DiscordMessage {
  const requesterMention = swap.requester.discordId ? `<@${swap.requester.discordId}>` : swap.requester.name
  const targetMention = swap.target.discordId ? `<@${swap.target.discordId}>` : swap.target.name

  const color = action === 'approved' ? 0x00ff00 : 0xff0000
  const title = action === 'approved' ? '✅ Swap Approved' : '❌ Swap Rejected'
  const description = action === 'approved' 
    ? `Duty swap between ${requesterMention} and ${targetMention} has been **approved**!`
    : `Duty swap between ${requesterMention} and ${targetMention} has been **rejected**.`

  return {
    content: `🔄 **Duty Swap ${action.charAt(0).toUpperCase() + action.slice(1)}**`,
    embeds: [{
      title,
      description,
      color,
      fields: [
        {
          name: '📅 Date',
          value: new Date(swap.dutyDate).toLocaleDateString(),
          inline: true
        },
        {
          name: '👥 Participants',
          value: `${requesterMention} ↔ ${targetMention}`,
          inline: true
        },
        {
          name: '📝 Reason',
          value: swap.reason,
          inline: false
        }
      ]
    }]
  }
}

function formatStudentStatusMessage(student: any, oldStatus: string, newStatus: string, reason: string): DiscordMessage {
  const studentMention = student.discordId ? `<@${student.discordId}>` : student.name
  
  let color = 0x808080 // gray for default
  let emoji = '📝'
  
  if (newStatus === 'LEAVE') {
    color = 0xff9900 // orange
    emoji = '🏖️'
  } else if (newStatus === 'ACTIVE') {
    color = 0x00ff00 // green
    emoji = '✅'
  } else if (newStatus === 'PLACED') {
    color = 0x0099ff // blue
    emoji = '💼'
  }

  const fields = [
    {
      name: '👤 Student',
      value: studentMention,
      inline: true
    },
    {
      name: '📊 Status Change',
      value: `${oldStatus} → ${newStatus}`,
      inline: true
    },
    {
      name: '📝 Reason',
      value: reason,
      inline: false
    }
  ]

  // Add leave dates if applicable
  if (newStatus === 'LEAVE' && student.leaveStartAt && student.leaveEndAt) {
    fields.push({
      name: '📅 Leave Period',
      value: `${new Date(student.leaveStartAt).toLocaleDateString()} - ${new Date(student.leaveEndAt).toLocaleDateString()}`,
      inline: false
    })
  }

  return {
    content: `${emoji} **Student Status Update**`,
    embeds: [{
      title: `Status Changed: ${oldStatus} → ${newStatus}`,
      description: `${studentMention}'s status has been updated`,
      color,
      fields
    }]
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, id, action, oldStatus, newStatus, reason } = await request.json()

    if (!type || !id) {
      return NextResponse.json({ error: 'Type and ID are required' }, { status: 400 })
    }

    let message: DiscordMessage

    switch (type) {
      case 'duty':
        const duty = await db.kitchenDuty.findUnique({
          where: { id },
          include: {
            teamLeader: { select: { id: true, name: true, discordId: true } },
            member2: { select: { id: true, name: true, discordId: true } },
            member3: { select: { id: true, name: true, discordId: true } },
            member4: { select: { id: true, name: true, discordId: true } }
          }
        })

        if (!duty) {
          return NextResponse.json({ error: 'Duty not found' }, { status: 404 })
        }

        message = formatDutyMessage(duty)
        break

      case 'swap':
        const swap = await db.dutySwap.findUnique({
          where: { id },
          include: {
            requester: { select: { id: true, name: true, discordId: true } },
            target: { select: { id: true, name: true, discordId: true } }
          }
        })

        if (!swap) {
          return NextResponse.json({ error: 'Swap not found' }, { status: 404 })
        }

        // If action is provided, use status message format
        if (action && ['approved', 'rejected'].includes(action)) {
          message = formatSwapStatusMessage(swap, action)
        } else {
          message = formatSwapMessage(swap)
        }
        break

      case 'student':
        if (!oldStatus || !newStatus || !reason) {
          return NextResponse.json({ 
            error: 'oldStatus, newStatus, and reason are required for student notifications' 
          }, { status: 400 })
        }

        const student = await db.student.findUnique({
          where: { id },
          select: { 
            id: true, 
            name: true, 
            discordId: true,
            leaveStartAt: true,
            leaveEndAt: true
          }
        })

        if (!student) {
          return NextResponse.json({ error: 'Student not found' }, { status: 404 })
        }

        message = formatStudentStatusMessage(student, oldStatus, newStatus, reason)
        break

      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
    }

    const result = await sendDiscordNotification(message)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error sending Discord notification:', error)
    return NextResponse.json({ 
      error: 'Failed to send Discord notification' 
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Send today's duty notification
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayDuty = await db.kitchenDuty.findFirst({
      where: {
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        teamLeader: { select: { id: true, name: true, discordId: true } },
        member2: { select: { id: true, name: true, discordId: true } },
        member3: { select: { id: true, name: true, discordId: true } },
        member4: { select: { id: true, name: true, discordId: true } }
      }
    })

    if (!todayDuty) {
      return NextResponse.json({ error: 'No duty assigned for today' }, { status: 404 })
    }

    const message = formatDutyMessage(todayDuty)
    const result = await sendDiscordNotification(message)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error sending daily notification:', error)
    return NextResponse.json({ 
      error: 'Failed to send daily notification' 
    }, { status: 500 })
  }
}