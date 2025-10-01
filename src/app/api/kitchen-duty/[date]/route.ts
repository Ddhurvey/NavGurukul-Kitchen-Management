import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    const { date } = params
    
    // Parse the date and set to start of day
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)

    // Delete the kitchen duty and all assignments
    const deletedDuty = await db.kitchenDuty.delete({
      where: { date: targetDate },
      include: {
        assignments: true
      }
    })

    return NextResponse.json({
      success: true,
      message: `Kitchen duty deleted for ${targetDate.toLocaleDateString()}`,
      deletedDuty
    })
  } catch (error) {
    console.error('Error deleting kitchen duty:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete kitchen duty' 
    }, { status: 500 })
  }
}