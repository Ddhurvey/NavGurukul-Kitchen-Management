import { NextRequest, NextResponse } from 'next/server'

// Discord configuration
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID

// Legacy mapping - kept for backward compatibility
// Now we primarily use Discord IDs from the database
const DISCORD_USER_MAPPING: { [key: string]: string } = {
  'ABBU': '123456789012345678',     // Replace with actual Discord user ID
  'Alice Johnson': '234567890123456789', // Replace with actual Discord user ID
  'Bhavesh': '345678901234567890',  // Replace with actual Discord user ID
  'Bob Smith': '456789012345678901', // Replace with actual Discord user ID
  'Charlie Davis': '567890123456789012', // Replace with actual Discord user ID
  'Devendra Dhurvey (꧁रA1꧂)': '678901234567890123', // Replace with actual Discord user ID
  'Diana Prince': '789012345678901234',  // Replace with actual Discord user ID
  'Govind': '890123456789012345',     // Replace with actual Discord user ID
  'Md Arhan Alam': '901234567890123456', // Replace with actual Discord user ID
  'Vishwanath Nagwat': '012345678901234567', // Replace with actual Discord user ID
  // Add more mappings as needed
}

// User interface for Discord mentions
interface UserWithDiscord {
  id: string
  name: string
  email: string
  discordId?: string | null
  role?: string
  isTeamLeader?: boolean
}

interface DiscordMessagePayload {
  content?: string
  embeds?: Array<{
    title?: string
    description?: string
    color?: number
    fields?: Array<{
      name: string
      value: string
      inline?: boolean
    }>
    footer?: {
      text: string
    }
    timestamp?: string
  }>
  allowed_mentions?: {
    users?: string[]
    roles?: string[]
    parse?: string[]
  }
}

export async function sendDiscordMessage(message: string, userIds: string[] = []): Promise<boolean> {
  try {
    // Method 1: Webhook (preferred for simple messages)
    if (DISCORD_WEBHOOK_URL) {
      return await sendViaWebhook(message, userIds)
    }
    
    // Method 2: Bot API (more complex but more features)
    if (DISCORD_BOT_TOKEN && DISCORD_CHANNEL_ID) {
      return await sendViaBot(message, userIds)
    }
    
    console.error('❌ No Discord configuration found')
    return false
    
  } catch (error) {
    console.error('❌ Error sending Discord message:', error)
    return false
  }
}

async function sendViaWebhook(message: string, userIds: string[]): Promise<boolean> {
  try {
    const payload: DiscordMessagePayload = {
      content: message,
      allowed_mentions: {
        users: userIds,
        parse: ['users']
      }
    }

    const response = await fetch(DISCORD_WEBHOOK_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      console.log('✅ Message sent via Discord webhook')
      return true
    } else {
      const error = await response.text()
      console.error('❌ Discord webhook error:', error)
      return false
    }
  } catch (error) {
    console.error('❌ Webhook send error:', error)
    return false
  }
}

async function sendViaBot(message: string, userIds: string[]): Promise<boolean> {
  try {
    const payload: DiscordMessagePayload = {
      content: message,
      allowed_mentions: {
        users: userIds,
        parse: ['users']
      }
    }

    const response = await fetch(
      `https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      }
    )

    if (response.ok) {
      console.log('✅ Message sent via Discord bot')
      return true
    } else {
      const error = await response.text()
      console.error('❌ Discord bot error:', error)
      return false
    }
  } catch (error) {
    console.error('❌ Bot send error:', error)
    return false
  }
}

export function getDiscordUserId(userName: string): string {
  return DISCORD_USER_MAPPING[userName] || ''
}

export function convertToDiscordMentions(names: string[]): { mentions: string[], userIds: string[] } {
  const mentions: string[] = []
  const userIds: string[] = []
  
  names.forEach(name => {
    const userId = getDiscordUserId(name)
    if (userId) {
      mentions.push(`<@${userId}>`)
      userIds.push(userId)
    } else {
      // Fallback to name-based mention if no user ID found
      mentions.push(`@${name.replace(/\s+/g, '')}`)
    }
  })
  
  return { mentions, userIds }
}

// Enhanced function to convert users with database Discord IDs to mentions
export function convertUsersToDiscordMentions(users: UserWithDiscord[]): { mentions: string[], userIds: string[] } {
  const mentions: string[] = []
  const userIds: string[] = []
  
  users.forEach(user => {
    let mention = ''
    let userId = ''
    
    // First try to use Discord ID from database
    if (user.discordId) {
      mention = `<@${user.discordId}>`
      userId = user.discordId
    } else {
      // Fallback to legacy mapping
      userId = getDiscordUserId(user.name)
      if (userId) {
        mention = `<@${userId}>`
      } else {
        // Final fallback to name-based mention
        mention = `@${user.name.replace(/\s+/g, '')}`
      }
    }
    
    // Add role indicators
    if (user.isTeamLeader) {
      mention += ' (T.L)'
    } else if (user.role === 'IT') {
      mention += ' (IT)'
    }
    
    mentions.push(mention)
    if (userId) {
      userIds.push(userId)
    }
  })
  
  return { mentions, userIds }
}

// Function to format kitchen team message with proper Discord mentions
export function formatKitchenTeamMessage(users: UserWithDiscord[], dayOfWeek: string): string {
  const { mentions } = convertUsersToDiscordMentions(users)
  
  let message = ''
  
  // Sort users: team leader first
  const sortedUsers = [...users].sort((a, b) => {
    if (a.isTeamLeader) return -1
    if (b.isTeamLeader) return 1
    return 0
  })
  
  // Add team members with preferences and TL indicator
  sortedUsers.forEach(user => {
    const preference = user.foodPreference || 'GENERAL'
    const tl = user.isTeamLeader ? ' (T.L)' : ''
    const name = user.name.replace(/\s+/g, '-')
    message += `@${name}- ( ${preference} )${tl}\n`
  })
  
  message += '\n'
  
  // Add default menu if no menu provided
  message += `Breakfast:- Item\n`
  message += `Lunch:- Item\n`
  message += `Dinner:- Item\n\n`
  
  message += `@Dharamshala Student (current)\n`
  message += `Regards (F.C)`
  
  return message
}

// Function to format today's menu with kitchen team
export function formatTodayMenuNotification(
  menu: any,
  teamUsers: UserWithDiscord[],
  dayOfWeek: string
): string {
  // Sort users: team leader first
  const sortedUsers = [...teamUsers].sort((a, b) => {
    if (a.isTeamLeader) return -1
    if (b.isTeamLeader) return 1
    return 0
  })
  
  let message = ''
  
  // Add team members with preferences and TL indicator
  sortedUsers.forEach(user => {
    const preference = user.foodPreference || 'GENERAL'
    const tl = user.isTeamLeader ? ' (T.L)' : ''
    const name = user.name.replace(/\s+/g, '-')
    message += `@${name}- ( ${preference} )${tl}\n`
  })
  
  message += '\n'
  
  // Add actual menu items
  message += `Breakfast:- ${menu.breakfast || 'Item'}\n`
  message += `Lunch:- ${menu.lunch || 'Item'}\n`
  message += `Dinner:- ${menu.dinner || 'Item'}\n\n`
  
  message += `@Dharamshala Student (current)\n`
  message += `Regards (F.C)`
  
  return message
}

// Function to format Sunday special message
export function formatSundaySpecialMessage(users: UserWithDiscord[], menu?: any): string {
  // Sort users: team leader first
  const sortedUsers = [...users].sort((a, b) => {
    if (a.isTeamLeader) return -1
    if (b.isTeamLeader) return 1
    return 0
  })
  
  let message = ''
  
  // Add team members with preferences and TL indicator
  sortedUsers.forEach(user => {
    const preference = user.foodPreference || 'GENERAL'
    const tl = user.isTeamLeader ? ' (T.L)' : ''
    const name = user.name.replace(/\s+/g, '-')
    message += `@${name}- ( ${preference} )${tl}\n`
  })
  
  message += '\n'
  
  // Add menu if available
  if (menu) {
    message += `Breakfast:- ${menu.breakfast || 'Item'}\n`
    message += `Lunch:- ${menu.lunch || 'Item'}\n`
    message += `Dinner:- ${menu.dinner || 'Item'}\n\n`
  } else {
    message += `Breakfast:- Item\n`
    message += `Lunch:- Item\n`
    message += `Dinner:- Item\n\n`
  }
  
  message += `@Dharamshala Student (current)\n`
  message += `Regards (F.C)`
  
  return message
}

export function createDiscordEmbed(
  title: string,
  description: string,
  fields: Array<{ name: string, value: string, inline?: boolean }>,
  color: number = 0x00AE86
): DiscordMessagePayload {
  return {
    embeds: [{
      title,
      description,
      color,
      fields,
      footer: {
        text: 'NavGurukul Kitchen Management System'
      },
      timestamp: new Date().toISOString()
    }]
  }
}

export async function sendDiscordNotification(message: string): Promise<{ success: boolean, error?: string }> {
  try {
    const success = await sendDiscordMessage(message)
    if (success) {
      return { success: true }
    } else {
      return { success: false, error: 'Failed to send Discord message' }
    }
  } catch (error) {
    console.error('❌ Error sending Discord notification:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export async function testDiscordConnection(): Promise<boolean> {
  try {
    const testMessage = "🧪 Kitchen Bot Test Message - System is working!"
    return await sendDiscordMessage(testMessage)
  } catch (error) {
    console.error('❌ Discord connection test failed:', error)
    return false
  }
}