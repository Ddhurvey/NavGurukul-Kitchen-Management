import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const leaves = await db.leave.findMany({
      include: {
        student: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(leaves)
  } catch (error) {
    console.error('Error fetching leaves:', error)
    return NextResponse.json({ error: 'Failed to fetch leaves' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { studentId, startDate, endDate, reason } = data

    const leave = await db.leave.create({
      data: {
        studentId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason
      },
      include: {
        student: true
      }
    })

    // Update student presence status
    await db.student.update({
      where: { id: studentId },
      data: { isPresent: false }
    })

    return NextResponse.json(leave, { status: 201 })
  } catch (error) {
    console.error('Error creating leave:', error)
    return NextResponse.json({ error: 'Failed to create leave' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const { id, status } = data

    const leave = await db.leave.update({
      where: { id },
      data: { status },
      include: {
        student: true
      }
    })

    // If leave is approved, mark student as not present
    if (status === 'approved') {
      await db.student.update({
        where: { id: leave.studentId },
        data: { isPresent: false }
      })
    }

    return NextResponse.json(leave)
  } catch (error) {
    console.error('Error updating leave:', error)
    return NextResponse.json({ error: 'Failed to update leave' }, { status: 500 })
  }
}