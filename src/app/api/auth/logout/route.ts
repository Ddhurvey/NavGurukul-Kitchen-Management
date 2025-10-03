import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('token')?.value
    
    if (token) {
      try {
        // Verify token and get user info
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key') as any
        
        // Log the logout
        await db.historyLog.create({
          data: {
            action: 'USER_LOGOUT',
            updatedBy: decoded.userId,
            metadata: JSON.stringify({
              logoutTime: new Date().toISOString(),
              userAgent: request.headers.get('user-agent') || 'Unknown'
            })
          }
        })
      } catch (error) {
        // Token is invalid, but we still want to clear the cookie
        console.log('Invalid token during logout:', error)
      }
    }
    
    // Clear the auth cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logout successful'
    })
    
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    })
    
    return response
    
  } catch (error) {
    console.error('Logout error:', error)
    
    // Even if there's an error, we want to clear the cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logout successful'
    })
    
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    })
    
    return response
  }
}