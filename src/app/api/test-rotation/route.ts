import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  try {
    // Test if the dutyRotation table exists and works
    const rotationCount = await db.rotationCycle.count()
    const rotations = await db.rotationCycle.findMany()
    
    return NextResponse.json({
      success: true,
      rotationCount,
      rotations,
      message: 'Rotation cycle table is accessible'
    })
  } catch (error) {
    console.error('Error accessing duty rotation table:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to access duty rotation table'
    }, { status: 500 })
  }
}