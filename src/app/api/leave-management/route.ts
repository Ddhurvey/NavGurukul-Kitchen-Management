import { NextRequest, NextResponse } from 'next/server'
import { KitchenDutyManager } from '@/lib/kitchen-duty-manager'
import { requireAuth, requireRole } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN', 'FC'])
  if (!auth.user) return auth.response
  try {
    const data = await request.json()
    const { studentId, startDate, endDate, reason } = data

    if (!studentId || !startDate || !endDate || !reason) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: studentId, startDate, endDate, reason'
      }, { status: 400 })
    }

    const manager = new KitchenDutyManager()
    const result = await manager.processLeaveRequest(
      studentId,
      new Date(startDate),
      new Date(endDate),
      reason
    )

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error processing leave request:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process leave request'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.user) return auth.response
  try {
    const manager = new KitchenDutyManager()
    const cutoffStatus = manager.getCutoffStatus()
    
    return NextResponse.json({
      success: true,
      cutoffStatus
    })
  } catch (error) {
    console.error('Error getting leave status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get leave status'
    }, { status: 500 })
  }
}