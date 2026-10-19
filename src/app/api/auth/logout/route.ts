import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

const clearCookie = (response: NextResponse) => {
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    expires: new Date(0),
    path: '/'
  })
  return response
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  if (token) {
    const decoded = await verifyToken(token)
    if (decoded?.userId) {
      try {
        await db.user.update({
          where: { id: decoded.userId },
          data: { tokenVersion: { increment: 1 } }
        })
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
        // Clear the browser cookie even if audit logging fails.
        console.error('Logout session invalidation failed:', error)
        return clearCookie(NextResponse.json({ error: 'Could not invalidate session; please retry' }, { status: 500 }))
      }
    }
  }
  return clearCookie(NextResponse.json({ success: true, message: 'Logout successful' }))
}
