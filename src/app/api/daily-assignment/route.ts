import { NextRequest, NextResponse } from 'next/server'
import { KitchenDutyManager } from '@/lib/kitchen-duty-manager'

export async function POST(request: NextRequest) {
  try {
    const manager = new KitchenDutyManager()
    const result = await manager.performDailyAssignment()

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in daily assignment:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to perform daily assignment'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const manager = new KitchenDutyManager()
    
    const [todayTeam, tomorrowTeam, history] = await Promise.all([
      manager.getTodayTeam(),
      manager.getTomorrowTeam(),
      manager.getHistory(7) // Last 7 days
    ])

    return NextResponse.json({
      success: true,
      todayTeam,
      tomorrowTeam,
      history,
      cutoffStatus: manager.getCutoffStatus()
    })
  } catch (error) {
    console.error('Error getting duty status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get duty status'
    }, { status: 500 })
  }
}