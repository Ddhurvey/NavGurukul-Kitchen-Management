import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get overall statistics
    const totalStudents = await db.user.count({
      where: { status: 'ACTIVE' }
    })

    const totalKitchenTurns = await db.user.aggregate({
      where: { status: 'ACTIVE' },
      _sum: { totalKitchenTurns: true }
    })

    const totalLeaveDays = await db.user.aggregate({
      where: { status: 'ACTIVE' },
      _sum: { leaveDays: true }
    })

    // Food preference distribution
    const foodPreferences = await db.user.groupBy({
      by: ['foodPreference'],
      where: { status: 'ACTIVE' },
      _count: { foodPreference: true }
    })

    // Role distribution
    const roleDistribution = await db.user.groupBy({
      by: ['role'],
      where: { status: 'ACTIVE' },
      _count: { role: true }
    })

    // Kitchen turn distribution
    const kitchenTurnDistribution = await db.user.groupBy({
      by: ['totalKitchenTurns'],
      where: { 
        status: 'ACTIVE',
        role: 'STUDENT'
      },
      _count: { totalKitchenTurns: true }
    })

    // Recent kitchen turns (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const recentKitchenTurns = await db.kitchenTurn.findMany({
      where: {
        date: {
          gte: thirtyDaysAgo
        }
      },
      include: {
        assignedStudents: {
          include: {
            student: true
          }
        },
        teamLeader: true
      },
      orderBy: {
        date: 'desc'
      }
    })

    // Leave statistics
    const approvedLeaves = await db.leave.count({
      where: { status: 'APPROVED' }
    })

    const pendingLeaves = await db.leave.count({
      where: { status: 'PENDING' }
    })

    // Top performers (students with most kitchen turns)
    const topPerformers = await db.user.findMany({
      where: { 
        status: 'ACTIVE',
        role: 'STUDENT'
      },
      orderBy: {
        totalKitchenTurns: 'desc'
      },
      take: 5,
      select: {
        id: true,
        name: true,
        totalKitchenTurns: true,
        leaveDays: true
      }
    })

    // Students who need more turns (lowest turn count)
    const needMoreTurns = await db.user.findMany({
      where: { 
        status: 'ACTIVE',
        role: 'STUDENT'
      },
      orderBy: {
        totalKitchenTurns: 'asc'
      },
      take: 5,
      select: {
        id: true,
        name: true,
        totalKitchenTurns: true,
        leaveDays: true
      }
    })

    // Monthly statistics (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const monthlyStats = await db.kitchenTurn.groupBy({
      by: ['date'],
      where: {
        date: {
          gte: sixMonthsAgo
        }
      },
      _count: {
        date: true
      }
    })

    // Process monthly stats to group by month
    const monthlyData = processMonthlyData(monthlyStats)

    return NextResponse.json({
      overview: {
        totalStudents,
        totalKitchenTurns: totalKitchenTurns._sum.totalKitchenTurns || 0,
        totalLeaveDays: totalLeaveDays._sum.leaveDays || 0,
        approvedLeaves,
        pendingLeaves
      },
      distributions: {
        foodPreferences,
        roleDistribution,
        kitchenTurnDistribution
      },
      performers: {
        topPerformers,
        needMoreTurns
      },
      recentActivity: {
        recentKitchenTurns: recentKitchenTurns.slice(0, 10)
      },
      monthlyData
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

function processMonthlyData(monthlyStats: any[]) {
  const monthlyMap = new Map()

  monthlyStats.forEach(stat => {
    const date = new Date(stat.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    if (monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, monthlyMap.get(monthKey) + stat._count.date)
    } else {
      monthlyMap.set(monthKey, stat._count.date)
    }
  })

  return Array.from(monthlyMap.entries())
    .map(([month, count]) => ({
      month,
      count
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
}