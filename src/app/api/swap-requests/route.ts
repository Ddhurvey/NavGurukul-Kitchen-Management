import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.user) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const requestedStatus = searchParams.get('status')
    const where: any = {}

    if (requestedStatus) {
      const status = requestedStatus.toUpperCase()
      if (!['PENDING', 'ACCEPTED', 'REJECTED'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 })
      }
      where.status = status
    }

    if (!['ADMIN', 'FC'].includes(auth.user.role)) {
      where.OR = [
        { fromStudentId: auth.user.id },
        { toStudentId: auth.user.id }
      ]
    }

    const swapRequests = await db.exchangeRequest.findMany({
      where,
      include: {
        fromStudent: { select: { id: true, name: true, email: true } },
        toStudent: { select: { id: true, name: true, email: true } },
        kitchenTurn: { select: { id: true, date: true, status: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(swapRequests)
  } catch (error) {
    console.error('Error fetching swap requests:', error)
    return NextResponse.json({ error: 'Failed to fetch swap requests' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.user) return auth.response

  try {
    const body = await request.json()
    const fromStudentId = auth.user.id
    const { toStudentId, kitchenTurnId, reason, swapReason } = body

    if (!toStudentId || !kitchenTurnId || typeof reason !== 'string' || reason.trim().length < 5 ||
        !['HEALTH_ISSUE', 'LEAVE', 'PERSONAL_WORK', 'FAMILY_EMERGENCY', 'MEDICAL_APPOINTMENT', 'OTHER'].includes(swapReason)) {
      return NextResponse.json({ error: 'Valid target student, kitchen turn, reason and swap reason are required' }, { status: 400 })
    }

    if (toStudentId === fromStudentId) {
      return NextResponse.json({ error: 'You cannot request a swap with yourself' }, { status: 400 })
    }

    const [fromStudent, toStudent, assignment] = await Promise.all([
      db.user.findUnique({ where: { id: fromStudentId }, select: { id: true, status: true } }),
      db.user.findUnique({ where: { id: toStudentId }, select: { id: true, status: true } }),
      db.kitchenTurnStudent.findUnique({
        where: { kitchenTurnId_studentId: { kitchenTurnId, studentId: fromStudentId } },
        select: { kitchenTurnId: true }
      })
    ])

    if (!fromStudent || !toStudent || fromStudent.status !== 'ACTIVE' || toStudent.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Both students must exist and be active' }, { status: 400 })
    }
    if (!assignment) {
      return NextResponse.json({ error: 'You are not assigned to this kitchen turn' }, { status: 403 })
    }

    const existing = await db.exchangeRequest.findFirst({
      where: { kitchenTurnId, fromStudentId, status: 'PENDING' }
    })
    if (existing) {
      return NextResponse.json({ error: 'A pending swap request already exists for this duty' }, { status: 409 })
    }

    const swapRequest = await db.exchangeRequest.create({
      data: { fromStudentId, toStudentId, kitchenTurnId, reason: reason.trim(), swapReason, status: 'PENDING' },
      include: {
        fromStudent: { select: { id: true, name: true, email: true } },
        toStudent: { select: { id: true, name: true, email: true } },
        kitchenTurn: { select: { id: true, date: true, status: true } }
      }
    })

    await db.historyLog.create({
      data: {
        action: 'SWAP_REQUEST_CREATED',
        updatedBy: auth.user.id,
        metadata: JSON.stringify({ swapRequestId: swapRequest.id, kitchenTurnId, toStudentId, swapReason })
      }
    })

    return NextResponse.json(swapRequest, { status: 201 })
  } catch (error) {
    console.error('Error creating swap request:', error)
    return NextResponse.json({ error: 'Failed to create swap request' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN', 'FC'])
  if (!auth.user) return auth.response

  try {
    const body = await request.json()
    const id = typeof body.id === 'string' ? body.id : ''
    const status = typeof body.status === 'string' ? body.status.toUpperCase() : ''

    if (!id || !['ACCEPTED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Request ID and ACCEPTED or REJECTED status are required' }, { status: 400 })
    }

    const existing = await db.exchangeRequest.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Swap request not found' }, { status: 404 })
    if (existing.status !== 'PENDING') {
      return NextResponse.json({ error: 'Only pending swap requests can be reviewed' }, { status: 409 })
    }

    const updated = await db.exchangeRequest.update({
      where: { id },
      data: {
        status,
        approvedBy: auth.user.id,
        approvedAt: new Date(),
        rejectionReason: status === 'REJECTED' && typeof body.rejectionReason === 'string' ? body.rejectionReason : null
      },
      include: {
        fromStudent: { select: { id: true, name: true, email: true } },
        toStudent: { select: { id: true, name: true, email: true } },
        kitchenTurn: { select: { id: true, date: true, status: true } }
      }
    })

    await db.historyLog.create({
      data: {
        action: status === 'ACCEPTED' ? 'SWAP_REQUEST_ACCEPTED' : 'SWAP_REQUEST_REJECTED',
        updatedBy: auth.user.id,
        metadata: JSON.stringify({ swapRequestId: id, status })
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating swap request:', error)
    return NextResponse.json({ error: 'Failed to update swap request' }, { status: 500 })
  }
}
