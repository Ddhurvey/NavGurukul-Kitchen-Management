import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getIndiaToday, formatIndiaDate } from '@/lib/time'
import { addDays } from '@/lib/utils'
import { sendDiscordMessage, convertToDiscordMentions, testDiscordConnection, createDiscordEmbed } from '@/lib/discord'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const testMode = searchParams.get('test') === 'true'
    
    // Test Discord connection if requested
    if (testMode) {
      const isConnected = await testDiscordConnection()
      return NextResponse.json({
        success: isConnected,
        message: isConnected ? 'Discord connection successful' : 'Discord connection failed',
        config: {
          hasWebhook: !!process.env.DISCORD_WEBHOOK_URL,
          hasBotToken: !!process.env.DISCORD_BOT_TOKEN,
          hasChannelId: !!process.env.DISCORD_CHANNEL_ID
        }
      })
    }
    
    // Use tomorrow's date by default, or specific date if provided
    const targetDate = dateParam ? new Date(dateParam) : addDays(getIndiaToday(), 1)
    
    // Get kitchen team for the target date
    const kitchenTurn = await db.kitchenTurn.findUnique({
      where: {
        date: targetDate
      },
      include: {
        assignedStudents: {
          include: {
            student: true
          }
        },
        teamLeader: true
      }
    })

    if (!kitchenTurn || !kitchenTurn.assignedStudents.length) {
      return NextResponse.json(
        { error: 'No kitchen team assigned for the specified date' },
        { status: 404 }
      )
    }

    // Get food menu for the target date
    const foodMenu = await db.foodMenu.findUnique({
      where: {
        date: targetDate
      },
      include: {
        updatedByUser: {
          select: {
            name: true,
            role: true
          }
        }
      }
    })

    // Get current student location
    const currentLocation = "Dharamshala"

    // Format Discord message with proper mentions
    const { discordMessage, userIds } = formatDiscordMessageWithMentions(kitchenTurn, foodMenu, currentLocation, targetDate)
    
    // Also return raw data for customization
    const rawData = {
      date: formatIndiaDate(targetDate),
      kitchenTeam: kitchenTurn.assignedStudents.map(as => ({
        name: as.student.name,
        discordTag: `@${as.student.name.replace(/\s+/g, '')}`,
        isTeamLeader: kitchenTurn.teamLeaderId === as.student.id,
        isIT: as.student.name.toLowerCase().includes('it') || as.student.email.toLowerCase().includes('it'),
        foodPreference: as.student.foodPreference
      })),
      meals: {
        breakfast: foodMenu?.breakfast || 'Not set',
        lunch: foodMenu?.lunch || 'Not set',
        dinner: foodMenu?.dinner || 'Not set'
      },
      location: currentLocation,
      updatedBy: foodMenu?.updatedByUser?.name || 'System'
    }

    return NextResponse.json({
      success: true,
      discordMessage,
      discordMessageWithMentions: discordMessage,
      userIds,
      rawData,
      metadata: {
        date: formatIndiaDate(targetDate),
        teamSize: kitchenTurn.assignedStudents.length,
        hasTeamLeader: !!kitchenTurn.teamLeaderId,
        hasMenu: !!foodMenu,
        discordConfigured: !!process.env.DISCORD_WEBHOOK_URL || !!process.env.DISCORD_BOT_TOKEN
      }
    })

  } catch (error) {
    console.error('Error generating Discord message:', error)
    return NextResponse.json(
      { error: 'Failed to generate Discord message' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { date, customMessage, includeLocation, includeTeamDetails, sendToDiscord = false } = await request.json()
    
    const targetDate = date ? new Date(date) : addDays(getIndiaToday(), 1)
    
    // Get kitchen team and food menu
    const kitchenTurn = await db.kitchenTurn.findUnique({
      where: { date: targetDate },
      include: {
        assignedStudents: { include: { student: true } },
        teamLeader: true
      }
    })

    const foodMenu = await db.foodMenu.findUnique({
      where: { date: targetDate },
      include: { updatedByUser: { select: { name: true, role: true } } }
    })

    if (!kitchenTurn || !kitchenTurn.assignedStudents.length) {
      return NextResponse.json(
        { error: 'No kitchen team assigned for the specified date' },
        { status: 404 }
      )
    }

    // Custom message formatting
    const { discordMessage, userIds } = formatCustomDiscordMessage(
      kitchenTurn, 
      foodMenu, 
      targetDate, 
      customMessage, 
      includeLocation, 
      includeTeamDetails
    )

    let discordSent = false
    let discordError = null

    // Send to Discord if requested
    if (sendToDiscord) {
      try {
        discordSent = await sendDiscordMessage(discordMessage, userIds)
        if (!discordSent) {
          discordError = 'Failed to send message to Discord - check configuration'
        }
      } catch (error) {
        discordError = error instanceof Error ? error.message : 'Unknown Discord error'
        console.error('Discord send error:', error)
      }
    }

    return NextResponse.json({
      success: true,
      discordMessage,
      discordMessageWithMentions: discordMessage,
      userIds,
      date: formatIndiaDate(targetDate),
      discordSent,
      discordError,
      metadata: {
        discordConfigured: !!process.env.DISCORD_WEBHOOK_URL || !!process.env.DISCORD_BOT_TOKEN,
        sendToDiscord
      }
    })

  } catch (error) {
    console.error('Error generating custom Discord message:', error)
    return NextResponse.json(
      { error: 'Failed to generate custom Discord message' },
      { status: 500 }
    )
  }
}

function formatDiscordMessageWithMentions(kitchenTurn: any, foodMenu: any, location: string, date: Date): { discordMessage: string, userIds: string[] } {
  // Sort students: team leader first
  const sortedStudents = [...kitchenTurn.assignedStudents].sort((a: any, b: any) => {
    if (kitchenTurn.teamLeaderId === a.student.id) return -1
    if (kitchenTurn.teamLeaderId === b.student.id) return 1
    return 0
  })
  
  let message = ''
  
  // Format team members with proper Discord tagging
  sortedStudents.forEach((assignment: any) => {
    const isTL = kitchenTurn.teamLeaderId === assignment.student.id
    const tl = isTL ? ' (T.L)' : ''
    const preference = assignment.student.foodPreference || 'GENERAL'
    
    // Use Discord ID for proper tagging if available, otherwise use formatted name
    let displayName = ''
    if (assignment.student.discordId) {
      displayName = `<@${assignment.student.discordId}>`
    } else {
      // Fallback to formatted name if no Discord ID
      const name = assignment.student.name.replace(/\s+/g, '-')
      displayName = `@${name}-`
    }
    
    message += `${displayName} ( ${preference} )${tl}\n`
  })
  
  message += '\n'
  
  // Format meals exactly as required
  message += `Breakfast:- ${foodMenu?.breakfast || 'Item'}\n`
  message += `Lunch:- ${foodMenu?.lunch || 'Item'}\n`
  message += `Dinner:- ${foodMenu?.dinner || 'Item'}\n\n`
  
  message += `@Dharamshala Student (current)\n`
  message += `Regards (F.C)`

  return { discordMessage: message, userIds: [] }
}

function formatCustomDiscordMessage(
  kitchenTurn: any, 
  foodMenu: any, 
  date: Date, 
  customMessage: string,
  includeLocation: boolean,
  includeTeamDetails: boolean
): { discordMessage: string, userIds: string[] } {
  let message = customMessage || ''
  let userIds: string[] = []
  
  if (includeTeamDetails && kitchenTurn.assignedStudents.length > 0) {
    // Sort students: team leader first
    const sortedStudents = [...kitchenTurn.assignedStudents].sort((a: any, b: any) => {
      if (kitchenTurn.teamLeaderId === a.student.id) return -1
      if (kitchenTurn.teamLeaderId === b.student.id) return 1
      return 0
    })
    
    // Format team members with proper Discord tagging
    sortedStudents.forEach((assignment: any) => {
      const isTL = kitchenTurn.teamLeaderId === assignment.student.id
      const tl = isTL ? ' (T.L)' : ''
      const preference = assignment.student.foodPreference || 'GENERAL'
      
      // Use Discord ID for proper tagging if available, otherwise use formatted name
      let displayName = ''
      if (assignment.student.discordId) {
        displayName = `<@${assignment.student.discordId}>`
      } else {
        // Fallback to formatted name if no Discord ID
        const name = assignment.student.name.replace(/\s+/g, '-')
        displayName = `@${name}-`
      }
      
      message += `${displayName} ( ${preference} )${tl}\n`
    })
    
    message += '\n'
  }
  
  if (foodMenu) {
    message += `Breakfast:- ${foodMenu.breakfast || 'Item'}\n`
    message += `Lunch:- ${foodMenu.lunch || 'Item'}\n`
    message += `Dinner:- ${foodMenu.dinner || 'Item'}\n\n`
  }
  
  if (includeLocation) {
    message += `@Dharamshala Student (current)\n`
  }
  
  message += `Regards (F.C)`
  
  return { discordMessage: message, userIds }
}