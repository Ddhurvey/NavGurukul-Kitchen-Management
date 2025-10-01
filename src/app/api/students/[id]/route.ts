import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Status } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const student = await db.student.findUnique({
      where: { id },
      include: {
        assignedDuties: {
          include: {
            teamLeader: {
              select: { id: true, name: true, email: true }
            },
            member2: {
              select: { id: true, name: true, email: true }
            },
            member3: {
              select: { id: true, name: true, email: true }
            },
            member4: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { date: 'desc' }
        },
        // Get all history records where student participated
        historyDutiesAsLeader: {
          orderBy: { date: 'desc' }
        },
        historyDutiesAsMember2: {
          orderBy: { date: 'desc' }
        },
        historyDutiesAsMember3: {
          orderBy: { date: 'desc' }
        },
        historyDutiesAsMember4: {
          orderBy: { date: 'desc' }
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    return NextResponse.json(student)
  } catch (error) {
    console.error('Error fetching student:', error)
    return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    // Check if student exists
    const existingStudent = await db.student.findUnique({
      where: { id }
    })

    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Check if email is being changed and if it's already taken
    if (data.email !== existingStudent.email) {
      const emailExists = await db.student.findUnique({
        where: { email: data.email }
      })

      if (emailExists) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
      }
    }

    const oldStatus = existingStudent.status
    const newStatus = data.status as Status

    // Update student data
    const updatedStudent = await db.student.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        discordId: data.discordId || null,
        foodPreference: data.foodPreference,
        workType: data.workType,
        status: newStatus,
        leaveStartAt: data.leaveStartAt ? new Date(data.leaveStartAt) : null,
        leaveEndAt: data.leaveEndAt ? new Date(data.leaveEndAt) : null,
        fcStartAt: data.fcStartAt ? new Date(data.fcStartAt) : null,
        fcEndAt: data.fcEndAt ? new Date(data.fcEndAt) : null,
        nextAvailableDate: data.nextAvailableDate ? new Date(data.nextAvailableDate) : null,
      }
    })

    // Additional validation for leave status
    if (newStatus === 'LEAVE') {
      if (!data.leaveStartAt || !data.leaveEndAt) {
        return NextResponse.json({ 
          error: 'Leave start and end dates are required when setting status to LEAVE.' 
        }, { status: 400 })
      }

      const startDate = new Date(data.leaveStartAt)
      const endDate = new Date(data.leaveEndAt)
      
      if (startDate >= endDate) {
        return NextResponse.json({ 
          error: 'Leave end date must be after start date.' 
        }, { status: 400 })
      }

      if (startDate < new Date()) {
        return NextResponse.json({ 
          error: 'Leave start date cannot be in the past.' 
        }, { status: 400 })
      }
    }

    // If status changed, create a status change record and regenerate kitchen team
    if (oldStatus !== newStatus) {
      // Make reason mandatory for status changes
      if (!data.statusReason || data.statusReason.trim().length === 0) {
        return NextResponse.json({ 
          error: 'Status reason is required for all status changes. Please provide a detailed reason.' 
        }, { status: 400 })
      }

      await db.studentStatusChange.create({
        data: {
          studentId: id,
          oldStatus,
          newStatus,
          reason: data.statusReason.trim(),
          changedBy: data.changedBy
        }
      })

      // Send Discord notification for student status change
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/discord/notify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'student',
            id: id,
            oldStatus: oldStatus,
            newStatus: newStatus,
            reason: data.statusReason.trim()
          })
        })
      } catch (notificationError) {
        console.error('Failed to send Discord notification for student status change:', notificationError)
        // Don't fail the request if notification fails
      }

      // If student is going on leave and has kitchen duties, regenerate team
      if (newStatus === 'LEAVE') {
        // For leave status, require leave dates
        if (!data.leaveStartAt || !data.leaveEndAt) {
          return NextResponse.json({ 
            error: 'Leave start and end dates are required when setting status to LEAVE.' 
          }, { status: 400 })
        }

        try {
          const autoGenerateResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auto-generate-team`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              studentId: id,
              leaveStartAt: data.leaveStartAt,
              leaveEndAt: data.leaveEndAt
            })
          })

          if (autoGenerateResponse.ok) {
            const result = await autoGenerateResponse.json()
            console.log('Kitchen team regenerated:', result)
          }
        } catch (error) {
          console.error('Failed to auto-generate kitchen team:', error)
        }
      }
    }

    return NextResponse.json(updatedStudent)
  } catch (error) {
    console.error('Error updating student:', error)
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Check if student exists
    const existingStudent = await db.student.findUnique({
      where: { id }
    })

    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Delete student (this will cascade delete related records)
    await db.student.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Student deleted successfully' })
  } catch (error) {
    console.error('Error deleting student:', error)
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 })
  }
}