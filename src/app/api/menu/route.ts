import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Default menu templates
const DEFAULT_MENUS = {
  PANEER: {
    breakfast: ['Poha with Sev', 'Upma with Peanuts', 'Sandwich with Tea', 'Idli with Sambar'],
    lunch: ['Dal Makhani + Rice + Roti', 'Paneer Butter Masala + Rice', 'Mix Veg + Paratha', 'Dal Tadka + Rice'],
    snacks: ['Samosa + Chai', 'Pakora + Tea', 'Vada Pav + Chai', 'Bread Pakora'],
    dinner: ['Mixed Veg + Paratha', 'Paneer Curry + Rice', 'Dal Fry + Roti', 'Veg Biryani + Raita']
  },
  EGG: {
    breakfast: ['Egg Bhurji + Bread', 'Boiled Eggs + Toast', 'Egg Sandwich + Tea', 'Omelette + Paratha'],
    lunch: ['Egg Curry + Rice + Roti', 'Egg Biryani + Raita', 'Egg Fried Rice + Manchurian', 'Boiled Eggs + Dal Rice'],
    snacks: ['Egg Roll + Chai', 'Egg Pakora + Tea', 'Egg Sandwich + Coffee', 'Boiled Eggs + Tea'],
    dinner: ['Egg Masala + Paratha', 'Egg Fried Rice + Curry', 'Egg Curry + Roti', 'Scrambled Eggs + Bread']
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const daysRange = parseInt(searchParams.get('days') || '21') // Default to 21 days (1 week past, current week, 1 week future)
    
    // Calculate date range (default: 7 days before today to 14 days after today)
    const today = new Date()
    const startOfWeek = startDate ? new Date(startDate) : new Date(today)
    startOfWeek.setDate(today.getDate() - 7) // Start 7 days ago
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + daysRange - 1)

    // Get kitchen duties for the extended period
    const duties = await db.kitchenDuty.findMany({
      where: {
        date: {
          gte: startOfWeek,
          lte: endOfWeek
        }
      },
      include: {
        teamLeader: {
          select: { name: true, foodPreference: true }
        },
        member2: {
          select: { name: true, foodPreference: true }
        },
        member3: {
          select: { name: true, foodPreference: true }
        },
        member4: {
          select: { name: true, foodPreference: true }
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    // Get kitchen history for past days (to fill gaps)
    const history = await db.kitchenHistory.findMany({
      where: {
        date: {
          gte: startOfWeek,
          lte: new Date() // Only get history up to today
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    // Get menu overrides for the period
    const menuOverrides = await db.menuOverride.findMany({
      where: {
        date: {
          gte: startOfWeek,
          lte: endOfWeek
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    // Generate extended menu
    const weeklyMenu: any[] = []
    for (let i = 0; i < daysRange; i++) {
      const currentDate = new Date(startOfWeek)
      currentDate.setDate(startOfWeek.getDate() + i)
      
      const duty = duties.find(d => 
        new Date(d.date).toDateString() === currentDate.toDateString()
      )
      
      const historyEntry = history.find(h => 
        new Date(h.date).toDateString() === currentDate.toDateString()
      )
      
      const override = menuOverrides.find(m => 
        new Date(m.date).toDateString() === currentDate.toDateString()
      )

      // Determine if this day is past, present, or future
      const todayStr = new Date().toDateString()
      const currentDayStr = currentDate.toDateString()
      const dayStatus = currentDayStr < todayStr ? 'past' : 
                       currentDayStr === todayStr ? 'today' : 'future'

      // Use history for past days if no duty exists, otherwise use duty
      let teamData = null
      let menuData = null
      let foodPreference = 'PANEER'

      if (dayStatus === 'past' && historyEntry && !duty) {
        // Use historical data for past days with no current duty
        teamData = {
          teamName: historyEntry.teamName,
          leader: historyEntry.teamLeaderName,
          members: [historyEntry.member2Name, historyEntry.member3Name, historyEntry.member4Name].filter(Boolean),
          isCompleted: historyEntry.isCompleted,
          isHistorical: true,
          historyId: historyEntry.id
        }
        menuData = {
          breakfast: historyEntry.breakfast,
          lunch: historyEntry.lunch,
          snacks: historyEntry.snacks,
          dinner: historyEntry.dinner,
          isOverride: true,
          reason: historyEntry.notes || 'Historical record'
        }
        foodPreference = historyEntry.foodPreference || 'PANEER'
      } else if (duty) {
        // Use current duty data
        const team = [duty.teamLeader, duty.member2, duty.member3, duty.member4]
        const hasEggEaters = team.some(member => member?.foodPreference === 'EGG')
        const hasPaneerEaters = team.some(member => member?.foodPreference === 'PANEER')
        
        foodPreference = hasEggEaters && !hasPaneerEaters ? 'EGG' : 'PANEER'
        
        teamData = {
          leader: duty.teamLeader.name,
          members: [duty.member2?.name, duty.member3?.name, duty.member4?.name].filter(Boolean),
          isCompleted: duty.isCompleted,
          isHistorical: false
        }
      }

      const defaultMenu = DEFAULT_MENUS[foodPreference as keyof typeof DEFAULT_MENUS]
      const dayIndex = currentDate.getDay()

      weeklyMenu.push({
        date: currentDate.toISOString(),
        dayName: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
        dayStatus, // 'past', 'today', 'future'
        team: teamData,
        menu: menuData || (override ? {
          breakfast: override.breakfast,
          lunch: override.lunch,
          snacks: override.snacks,
          dinner: override.dinner,
          isOverride: true,
          reason: override.reason
        } : {
          breakfast: defaultMenu.breakfast[dayIndex % defaultMenu.breakfast.length],
          lunch: defaultMenu.lunch[dayIndex % defaultMenu.lunch.length],
          snacks: defaultMenu.snacks[dayIndex % defaultMenu.snacks.length],
          dinner: defaultMenu.dinner[dayIndex % defaultMenu.dinner.length],
          isOverride: false
        }),
        foodPreference
      })
    }

    return NextResponse.json(weeklyMenu)
  } catch (error) {
    console.error('Error fetching weekly menu:', error)
    return NextResponse.json({ error: 'Failed to fetch weekly menu' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const menuOverride = await db.menuOverride.create({
      data: {
        date: new Date(data.date),
        breakfast: data.breakfast,
        lunch: data.lunch,
        snacks: data.snacks,
        dinner: data.dinner,
        reason: data.reason,
        createdBy: data.createdBy
      }
    })

    return NextResponse.json(menuOverride, { status: 201 })
  } catch (error) {
    console.error('Error creating menu override:', error)
    return NextResponse.json({ error: 'Failed to create menu override' }, { status: 500 })
  }
}