import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.user) return auth.response
  try {
    const [current, history] = await Promise.all([
      db.user.findMany({
        where: { role: 'FC', status: 'ACTIVE' },
        select: { id: true, name: true, email: true, role: true, status: true },
        orderBy: { updatedAt: 'desc' }
      }),
      db.userRoleHistory.findMany({
        where: { role: 'FC' },
        include: { student: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      })
    ])
    return NextResponse.json({ current, history })
  } catch (error) {
    console.error('Error fetching food coordinators:', error)
    return NextResponse.json({ error: 'Failed to fetch food coordinators' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN'])
  if (!auth.user) return auth.response
  try {
    const { studentId, startDate, endDate } = await request.json()
    if (typeof studentId !== 'string' || !studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }
    const selected = await db.user.findUnique({ where: { id: studentId }, select: { id: true, role: true, status: true } })
    if (!selected || selected.status !== 'ACTIVE' || !['STUDENT', 'FC'].includes(selected.role)) {
      return NextResponse.json({ error: 'An active student must be selected as Food Coordinator' }, { status: 400 })
    }
    const now = new Date()
    const effectiveStart = startDate ? new Date(startDate) : now
    const effectiveEnd = endDate ? new Date(endDate) : null
    if (Number.isNaN(effectiveStart.getTime()) || (effectiveEnd && Number.isNaN(effectiveEnd.getTime())) || (effectiveEnd && effectiveEnd <= effectiveStart)) {
      return NextResponse.json({ error: 'Invalid coordinator date range' }, { status: 400 })
    }
    await db.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { role: 'FC' }, data: { role: 'STUDENT' } })
      await tx.userRoleHistory.updateMany({ where: { role: 'FC', endDate: null }, data: { endDate: now } })
      await tx.user.update({ where: { id: studentId }, data: { role: 'FC' } })
      await tx.userRoleHistory.create({ data: { studentId, role: 'FC', startDate: effectiveStart, endDate: effectiveEnd } })
    })
    const fc = await db.user.findUnique({ where: { id: studentId }, select: { id: true, name: true, email: true, role: true, status: true } })
    return NextResponse.json(fc, { status: 201 })
  } catch (error) {
    console.error('Error creating food coordinator:', error)
    return NextResponse.json({ error: 'Failed to create food coordinator' }, { status: 500 })
  }
}
