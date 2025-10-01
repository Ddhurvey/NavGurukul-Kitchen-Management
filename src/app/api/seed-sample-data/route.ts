import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    console.log('Starting sample data seeding...')

    // Check if we already have kitchen duties
    const existingDuties = await db.kitchenDuty.count()
    if (existingDuties > 0) {
      return NextResponse.json({
        message: 'Sample data already exists',
        existingDuties
      })
    }

    // Get kitchen students
    const kitchenStudents = await db.student.findMany({
      where: { workType: 'KITCHEN', status: 'ACTIVE' },
      take: 8
    })

    if (kitchenStudents.length < 4) {
      return NextResponse.json({
        error: 'Need at least 4 kitchen students to create sample data',
        currentCount: kitchenStudents.length
      }, { status: 400 })
    }

    // Create sample duties for the past 2 weeks
    const today = new Date()
    const duties = []

    for (let i = 13; i >= 0; i--) {
      const dutyDate = new Date(today)
      dutyDate.setDate(today.getDate() - i)
      
      // Skip if it's a Sunday (no kitchen duty)
      if (dutyDate.getDay() === 0) continue

      const startIndex = (i % kitchenStudents.length)
      const teamMembers = [
        kitchenStudents[startIndex % kitchenStudents.length],
        kitchenStudents[(startIndex + 1) % kitchenStudents.length],
        kitchenStudents[(startIndex + 2) % kitchenStudents.length],
        kitchenStudents[(startIndex + 3) % kitchenStudents.length]
      ]

      const duty = await db.kitchenDuty.create({
        data: {
          date: dutyDate,
          teamLeaderId: teamMembers[0].id,
          member2Id: teamMembers[1].id,
          member3Id: teamMembers[2].id,
          member4Id: teamMembers[3].id,
          breakfast: ['Poha with Sev', 'Upma', 'Sandwich', 'Idli'][i % 4],
          lunch: ['Dal Makhani + Rice + Roti', 'Chole + Rice + Roti', 'Rajma + Rice + Roti', 'Mix Veg + Rice + Roti'][i % 4],
          snacks: ['Samosa + Chai', 'Pakora + Chai', 'Biscuits + Chai', 'Vada Pav + Chai'][i % 4],
          dinner: ['Mixed Veg + Paratha', 'Paneer Butter + Roti', 'Aloo Gobi + Roti', 'Dal Tadka + Rice'][i % 4],
          isCompleted: i < 7 // Mark duties older than a week as completed
        }
      })

      duties.push(duty)
      console.log(`Created duty for ${dutyDate.toLocaleDateString()}`)
    }

    // Update student total duties
    for (const student of kitchenStudents) {
      const dutyCount = await db.kitchenDuty.count({
        where: {
          OR: [
            { teamLeaderId: student.id },
            { member2Id: student.id },
            { member3Id: student.id },
            { member4Id: student.id }
          ]
        }
      })

      await db.student.update({
        where: { id: student.id },
        data: { totalDuties: dutyCount }
      })

      console.log(`Updated ${student.name} with ${dutyCount} total duties`)
    }

    console.log('Sample data seeding completed!')

    return NextResponse.json({
      message: 'Sample data created successfully',
      stats: {
        dutiesCreated: duties.length,
        studentsUpdated: kitchenStudents.length,
        dateRange: {
          from: duties[duties.length - 1]?.date,
          to: duties[0]?.date
        }
      }
    })

  } catch (error) {
    console.error('Error seeding sample data:', error)
    return NextResponse.json({ 
      error: 'Failed to seed sample data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}