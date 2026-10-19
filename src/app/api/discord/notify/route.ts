import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { getIndiaTomorrow, formatIndiaDate } from '@/lib/time'

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN', 'FC'])
  if (!auth.user) return auth.response
  if (!DISCORD_WEBHOOK_URL) return NextResponse.json({ error: 'Discord webhook is not configured' }, { status: 503 })
  try {
    const { type = 'daily' } = await request.json()

    if (type === 'daily') {
      // Get tomorrow's date
      const tomorrow = getIndiaTomorrow()

      // Get tomorrow's kitchen turn
      const kitchenTurn = await db.kitchenTurn.findUnique({
        where: {
          date: tomorrow
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

      // Get tomorrow's food menu
      const foodMenu = await db.foodMenu.findUnique({
        where: {
          date: tomorrow
        }
      })

      // If no kitchen turn for tomorrow, create one
      let tomorrowTurn = kitchenTurn
      if (!tomorrowTurn) {
        // Get 4 random active students
        const activeStudents = await db.user.findMany({
          where: {
            status: 'ACTIVE',
            role: 'STUDENT'
          },
          take: 4
        })

        if (activeStudents.length > 0) {
          tomorrowTurn = await db.kitchenTurn.create({
            data: {
              date: tomorrow,
              status: 'PENDING',
              teamLeaderId: activeStudents[0].id
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

          // Assign students
          await db.kitchenTurnStudent.createMany({
            data: activeStudents.map(student => ({
              kitchenTurnId: tomorrowTurn.id,
              studentId: student.id
            }))
          })

          // Refetch with students
          tomorrowTurn = await db.kitchenTurn.findUnique({
            where: {
              id: tomorrowTurn.id
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
        }
      }

      // If no food menu for tomorrow, create one
      let tomorrowMenu = foodMenu
      if (!tomorrowMenu) {
        // Get a valid admin user ID
        const adminUser = await db.user.findFirst({
          where: { role: 'ADMIN' }
        })
        
        if (!adminUser) {
          // If no admin, get any active user
          const anyUser = await db.user.findFirst({
            where: { status: 'ACTIVE' }
          })
          
          if (!anyUser) {
            return NextResponse.json(
              { error: 'No active users found to create food menu' },
              { status: 500 }
            )
          }
          
          tomorrowMenu = await db.foodMenu.create({
            data: {
              date: tomorrow,
              breakfast: 'Poha',
              lunch: 'Dal + Rice',
              snacks: 'Samosa',
              dinner: 'Veg + Roti',
              updatedBy: anyUser.id
            }
          })
        } else {
          tomorrowMenu = await db.foodMenu.create({
            data: {
              date: tomorrow,
              breakfast: 'Poha',
              lunch: 'Dal + Rice',
              snacks: 'Samosa',
              dinner: 'Veg + Roti',
              updatedBy: adminUser.id
            }
          })
        }
      }

      // Create Discord message
      const message = createDiscordMessage(tomorrowTurn, tomorrowMenu)

      // Send to Discord
      const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      })

      if (!response.ok) {
        throw new Error(`Discord API error: ${response.statusText}`)
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Daily notification sent successfully',
        data: {
          kitchenTurn: tomorrowTurn,
          foodMenu: tomorrowMenu
        }
      })
    }

    return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
  } catch (error) {
    console.error('Error sending Discord notification:', error)
    return NextResponse.json(
      { error: 'Failed to send Discord notification' },
      { status: 500 }
    )
  }
}

function createDiscordMessage(kitchenTurn: any, foodMenu: any) {
  const tomorrow = getIndiaTomorrow()

  let message = ''

  if (kitchenTurn && kitchenTurn.assignedStudents.length > 0) {
    // Sort students: team leader first
    const sortedStudents = [...kitchenTurn.assignedStudents].sort((a: any, b: any) => {
      if (kitchenTurn.teamLeaderId === a.student.id) return -1
      if (kitchenTurn.teamLeaderId === b.student.id) return 1
      return 0
    })
    
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
  } else {
    message += `No team assigned yet\n\n`
  }

  if (foodMenu) {
    message += `Breakfast:- ${foodMenu.breakfast || 'Item'}\n`
    message += `Lunch:- ${foodMenu.lunch || 'Item'}\n`
    message += `Dinner:- ${foodMenu.dinner || 'Item'}\n\n`
  } else {
    message += `Breakfast:- Item\n`
    message += `Lunch:- Item\n`
    message += `Dinner:- Item\n\n`
  }

  message += `@Dharamshala Student (current)\n`
  message += `Regards (F.C)`

  return {
    content: message,
    username: 'NavGurukul Kitchen Bot',
    avatar_url: 'https://cdn-icons-png.flaticon.com/512/3774/3774290.png'
  }
}

// Test endpoint
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN'])
  if (!auth.user) return auth.response
  if (!DISCORD_WEBHOOK_URL) return NextResponse.json({ error: 'Discord webhook is not configured' }, { status: 503 })
  try {
    const testMessage = {
      content: '**Test Message from NavGurukul Kitchen Bot**\n\nThis is a test notification to verify the Discord webhook is working correctly.\n\n@Dharamshala Student (current)\nRegards,\n(F.C)',
      username: 'NavGurukul Kitchen Bot',
      avatar_url: 'https://cdn-icons-png.flaticon.com/512/3774/3774290.png'
    }

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    })

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.statusText}`)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Test notification sent successfully' 
    })
  } catch (error) {
    console.error('Error sending test Discord notification:', error)
    return NextResponse.json(
      { error: 'Failed to send test Discord notification' },
      { status: 500 }
    )
  }
}