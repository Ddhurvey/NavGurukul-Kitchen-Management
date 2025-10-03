import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getWeekDates, getWeekNumber } from '@/lib/utils'

// GET weekly menu template
export async function GET() {
  try {
    // Get the default weekly menu template
    const weeklyTemplate = await db.weeklyMenuTemplate.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (!weeklyTemplate) {
      // Return default template if none exists
      return NextResponse.json({
        id: 'default',
        monday: { breakfast: 'Poha', lunch: 'Dal Rice', snacks: 'Samosa', dinner: 'Roti Sabzi' },
        tuesday: { breakfast: 'Upma', lunch: 'Rajma Rice', snacks: 'Pakora', dinner: 'Puri Sabzi' },
        wednesday: { breakfast: 'Sandwich', lunch: 'Chole Rice', snacks: 'Vada', dinner: 'Rice Dal' },
        thursday: { breakfast: 'Idli', lunch: 'Sambar Rice', snacks: 'Biscuits', dinner: 'Khichdi' },
        friday: { breakfast: 'Dosa', lunch: 'Curd Rice', snacks: 'Fruits', dinner: 'Soup Bread' },
        saturday: { breakfast: 'Paratha', lunch: 'Veg Biryani', snacks: 'Salad', dinner: 'Pasta' },
        sunday: { breakfast: 'Toast', lunch: 'Egg Curry', snacks: 'Nuts', dinner: 'Paneer Bhurji' },
        isDefault: true
      })
    }

    return NextResponse.json(weeklyTemplate)
  } catch (error) {
    console.error('Error fetching weekly menu template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch weekly menu template' },
      { status: 500 }
    )
  }
}

// POST update weekly menu template
export async function POST(request: NextRequest) {
  try {
    const { 
      monday, tuesday, wednesday, thursday, friday, saturday, sunday,
      createdBy 
    } = await request.json()

    // Validate Sunday rule (must include Egg + Paneer)
    if (sunday) {
      const sundayItems = `${sunday.lunch || ''} ${sunday.dinner || ''} ${sunday.breakfast || ''} ${sunday.snacks || ''}`.toLowerCase()
      const hasEgg = sundayItems.includes('egg')
      const hasPaneer = sundayItems.includes('paneer')
      
      if (!hasEgg || !hasPaneer) {
        return NextResponse.json(
          { error: 'Sunday menu must include both Egg and Paneer items' },
          { status: 400 }
        )
      }
    }

    // Delete existing template
    await db.weeklyMenuTemplate.deleteMany()

    // Create new template
    const weeklyTemplate = await db.weeklyMenuTemplate.create({
      data: {
        monday,
        tuesday,
        wednesday,
        thursday,
        friday,
        saturday,
        sunday,
        createdBy
      }
    })

    return NextResponse.json(weeklyTemplate)
  } catch (error) {
    console.error('Error updating weekly menu template:', error)
    return NextResponse.json(
      { error: 'Failed to update weekly menu template' },
      { status: 500 }
    )
  }
}

// PUT apply weekly template to specific week
export async function PUT(request: NextRequest) {
  try {
    const { weekNumber, year, createdBy } = await request.json()
    
    // Get the weekly template
    const template = await db.weeklyMenuTemplate.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'No weekly menu template found' },
        { status: 404 }
      )
    }

    // Get week dates
    const weekDates = getWeekDates(weekNumber, year)
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

    // Create or update food menus for each day
    for (let i = 0; i < weekDates.length; i++) {
      const date = weekDates[i]
      const dayName = dayNames[i]
      const dayMenu = template[dayName]

      if (dayMenu) {
        await db.foodMenu.upsert({
          where: { date },
          update: {
            breakfast: dayMenu.breakfast,
            lunch: dayMenu.lunch,
            snacks: dayMenu.snacks,
            dinner: dayMenu.dinner,
            updatedBy: createdBy,
            isWeeklyMenu: true,
            weekNumber
          },
          create: {
            date,
            breakfast: dayMenu.breakfast,
            lunch: dayMenu.lunch,
            snacks: dayMenu.snacks,
            dinner: dayMenu.dinner,
            updatedBy: createdBy,
            isWeeklyMenu: true,
            weekNumber
          }
        })
      }
    }

    return NextResponse.json({
      message: 'Weekly menu template applied successfully',
      weekNumber,
      year
    })
  } catch (error) {
    console.error('Error applying weekly menu template:', error)
    return NextResponse.json(
      { error: 'Failed to apply weekly menu template' },
      { status: 500 }
    )
  }
}