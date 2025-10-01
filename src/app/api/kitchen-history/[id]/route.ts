import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const history = await db.kitchenHistory.findUnique({
      where: { id }
    })

    if (!history) {
      return NextResponse.json({ error: 'Kitchen history not found' }, { status: 404 })
    }

    return NextResponse.json(history)
  } catch (error) {
    console.error('Error fetching kitchen history:', error)
    return NextResponse.json({ error: 'Failed to fetch kitchen history' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    // Check if history exists
    const existingHistory = await db.kitchenHistory.findUnique({
      where: { id }
    })

    if (!existingHistory) {
      return NextResponse.json({ error: 'Kitchen history not found' }, { status: 404 })
    }

    // Update kitchen history
    const updatedHistory = await db.kitchenHistory.update({
      where: { id },
      data: {
        teamName: data.teamName,
        breakfast: data.breakfast,
        lunch: data.lunch,
        snacks: data.snacks,
        dinner: data.dinner,
        foodPreference: data.foodPreference,
        isCompleted: data.isCompleted,
        notes: data.notes,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(updatedHistory)
  } catch (error) {
    console.error('Error updating kitchen history:', error)
    return NextResponse.json({ error: 'Failed to update kitchen history' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Check if history exists
    const existingHistory = await db.kitchenHistory.findUnique({
      where: { id }
    })

    if (!existingHistory) {
      return NextResponse.json({ error: 'Kitchen history not found' }, { status: 404 })
    }

    // Delete kitchen history
    await db.kitchenHistory.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Kitchen history deleted successfully' })
  } catch (error) {
    console.error('Error deleting kitchen history:', error)
    return NextResponse.json({ error: 'Failed to delete kitchen history' }, { status: 500 })
  }
}