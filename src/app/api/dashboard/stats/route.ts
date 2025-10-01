import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const stats = await db.student.groupBy({
      by: ['status', 'foodPreference', 'workType'],
      _count: true
    })

    const totalStudents = await db.student.count()
    const activeStudents = await db.student.count({ where: { status: 'ACTIVE' } })
    const onLeaveStudents = await db.student.count({ where: { status: 'LEAVE' } })
    const placedStudents = await db.student.count({ where: { status: 'PLACED' } })
    
    const eggEaters = await db.student.count({ where: { foodPreference: 'EGG' } })
    const paneerEaters = await db.student.count({ where: { foodPreference: 'PANEER' } })
    
    const kitchenTeam = await db.student.count({ where: { workType: 'KITCHEN' } })
    const teamMembers = await db.student.count({ where: { workType: 'TEAM' } })

    // Get duties for current month
    const currentMonth = new Date()
    currentMonth.setDate(1)
    const nextMonth = new Date(currentMonth)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    
    const totalDutiesThisMonth = await db.kitchenDuty.count({
      where: {
        date: {
          gte: currentMonth,
          lt: nextMonth
        }
      }
    })

    return NextResponse.json({
      totalStudents,
      activeStudents,
      onLeaveStudents,
      placedStudents,
      eggEaters,
      paneerEaters,
      kitchenTeam,
      teamMembers,
      totalDutiesThisMonth
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}