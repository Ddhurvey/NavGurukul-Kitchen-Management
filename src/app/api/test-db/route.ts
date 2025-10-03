import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Test basic database connection
    const userCount = await db.user.count()
    
    // Try to get a user with basic fields only (no photoUrl)
    const testUser = await db.user.findFirst({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        foodPreference: true,
        discordId: true,
        totalKitchenTurns: true,
        leaveDays: true,
        rotationPosition: true,
        lastTurnDate: true,
        rotationGroup: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    // Now try to get photoUrl specifically
    let photoUrlTest = null
    try {
      const userWithPhoto = await db.user.findFirst({
        select: {
          id: true,
          photoUrl: true
        }
      })
      photoUrlTest = {
        success: true,
        hasPhotoUrl: !!userWithPhoto?.photoUrl,
        photoUrl: userWithPhoto?.photoUrl
      }
    } catch (photoError) {
      photoUrlTest = {
        success: false,
        error: photoError instanceof Error ? photoError.message : 'PhotoUrl test failed'
      }
    }
    
    return NextResponse.json({
      success: true,
      userCount,
      testUser: testUser ? {
        id: testUser.id,
        name: testUser.name,
        email: testUser.email,
        hasDiscordId: !!testUser.discordId,
        discordId: testUser.discordId
      } : null,
      photoUrlTest,
      message: 'Database connection successful'
    })
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Database test failed',
      details: {
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 })
  }
}