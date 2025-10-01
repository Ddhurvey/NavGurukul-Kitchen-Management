import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const leaves = await db.leaveRecord.findMany({
      include: {
        student: {
          select: { id: true, name: true, email: true, discordId: true }
        }
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

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (start > end) {
      return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 })
    }

    // Check if student exists
    const student = await db.student.findUnique({
      where: { id: studentId }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Create leave record
    const leave = await db.leaveRecord.create({
      data: {
        studentId,
        startDate: start,
        endDate: end,
        reason,
        status: 'APPROVED'
      },
      include: {
        student: {
          select: { id: true, name: true, email: true, discordId: true }
        }
      }
    })

    // Update student status and leave dates
    await db.student.update({
      where: { id: studentId },
      data: {
        status: 'LEAVE',
        leaveStartAt: start,
        leaveEndAt: end,
        // Set next available date to 7 days after leave ends
        nextAvailableDate: new Date(end.getTime() + 7 * 24 * 60 * 60 * 1000)
      }
    })

    // Remove student from any kitchen duties during leave period
    await db.kitchenDuty.deleteMany({
      where: {
        OR: [
          { teamLeaderId: studentId },
          { member2Id: studentId },
          { member3Id: studentId },
          { member4Id: studentId }
        ],
        date: {
          gte: start,
          lte: end
        }
      }
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
    
    const { leaveId, status } = data

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const leave = await db.leaveRecord.update({
      where: { id: leaveId },
      data: { status },
      include: {
        student: {
          select: { id: true, name: true, email: true, discordId: true }
        }
      }
    })

    // If leave is rejected, update student status back to active
    if (status === 'REJECTED') {
      await db.student.update({
        where: { id: leave.studentId },
        data: {
          status: 'ACTIVE',
          leaveStartAt: null,
          leaveEndAt: null,
          nextAvailableDate: null
        }
      })
    }

    return NextResponse.json(leave)
  } catch (error) {
    console.error('Error updating leave:', error)
    return NextResponse.json({ error: 'Failed to update leave' }, { status: 500 })
  }
}