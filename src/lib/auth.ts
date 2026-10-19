import jwt, { JwtPayload } from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const TOKEN_TTL = '7d'
const JWT_ISSUER = 'navgurukul-kitchen-management'
const JWT_AUDIENCE = 'navgurukul-web'

export interface TokenPayload extends JwtPayload {
  userId: string
  email: string
  role: string
  tokenVersion: number
}

export interface AuthenticatedUser {
  id: string
  name: string
  email: string
  role: string
  status: string
  tokenVersion: number
  foodPreference: string
  totalKitchenTurns: number
  leaveDays: number
  discordId?: string | null
  rotationPosition: number
  lastTurnDate?: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be configured and contain at least 32 characters')
  }
  return secret
}

export function createAuthToken(user: Pick<AuthenticatedUser, 'id' | 'email' | 'role' | 'tokenVersion'>): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role, tokenVersion: user.tokenVersion },
    getJwtSecret(),
    { algorithm: 'HS256', expiresIn: TOKEN_TTL, issuer: JWT_ISSUER, audience: JWT_AUDIENCE }
  )
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    }) as TokenPayload
    if (!decoded.userId || typeof decoded.tokenVersion !== 'number') return null

    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, status: true, tokenVersion: true }
    })
    if (!user || user.status !== 'ACTIVE' || user.tokenVersion !== decoded.tokenVersion) return null

    return { ...decoded, email: user.email, role: user.role }
  } catch {
    return null
  }
}

export async function requireAuth(request: NextRequest): Promise<
  { user: AuthenticatedUser; response?: never } |
  { user?: never; response: NextResponse }
> {
  const token = request.cookies.get('token')?.value
  if (!token) return { response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }

  const payload = await verifyToken(token)
  if (!payload) {
    const response = NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
    response.cookies.set('token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 0, path: '/' })
    return { response }
  }

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, name: true, email: true, role: true, status: true, tokenVersion: true, foodPreference: true, totalKitchenTurns: true, leaveDays: true, discordId: true, rotationPosition: true, lastTurnDate: true, createdAt: true, updatedAt: true }
  })
  if (!user || user.status !== 'ACTIVE') {
    return { response: NextResponse.json({ error: 'Account is not active' }, { status: 401 }) }
  }
  return { user }
}

export async function requireRole(request: NextRequest, roles: string[]): Promise<
  { user: AuthenticatedUser; response?: never } |
  { user?: never; response: NextResponse }
> {
  const result = await requireAuth(request)
  if (!result.user) return result
  if (!roles.includes(result.user.role)) {
    return { response: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }) }
  }
  return result
}
