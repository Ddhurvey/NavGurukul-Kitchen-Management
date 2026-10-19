import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN', 'FC'])
  if (!auth.user) return auth.response
  try {
    const leaves = await db.leave.findMany({
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(leaves)
  } catch (error) {
    console.error('Error fetching leaves:', error)
    return NextResponse.json({ error: 'Failed to fetch leaves' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN', 'FC'])
  if (!auth.user) return auth.response
  try {
    const data = await request.json()
    const { studentId, startDate, endDate, reason } = data
    if (typeof studentId !== 'string' || !studentId || typeof reason !== 'string' || !reason.trim() || !startDate || !endDate) {
      return NextResponse.json({ error: 'Student ID, dates and reason are required' }, { status: 400 })
    }
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return NextResponse.json({ error: 'Invalid leave date range' }, { status: 400 })
    }
    const student = await db.user.findUnique({ where: { id: studentId }, select: { id: true, role: true, status: true } })
    if (!student || student.role !== 'STUDENT') return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    const leave = await db.leave.create({
      data: { studentId, startDate: start, endDate: end, reason: reason.trim() },
      include: { student: { select: { id: true, name: true, email: true } } }
    })
    return NextResponse.json(leave, { status: 201 })
  } catch (error) {
    console.error('Error creating leave:', error)
    return NextResponse.json({ error: 'Failed to create leave' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN', 'FC'])
  if (!auth.user) return auth.response
  try {
    const data = await request.json()
    const id = typeof data.id === 'string' ? data.id : ''
    const status = typeof data.status === 'string' ? data.status.toUpperCase() : ''
    if (!id || !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Leave ID and a valid status are required' }, { status: 400 })
    }
    const normalizedStatus = status as 'PENDING' | 'APPROVED' | 'REJECTED'
    const leave = await db.leave.update({
      where: { id },
      data: { status: normalizedStatus },
      include: { student: { select: { id: true, name: true, email: true } } }
    })
    return NextResponse.json(leave)
  } catch (error) {
    console.error('Error updating leave:', error)
    return NextResponse.json({ error: 'Failed to update leave' }, { status: 500 })
  }
}
