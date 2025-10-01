import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Status } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const { studentId, leaveStartAt, leaveEndAt } = await request.json()

    if (!studentId || !leaveStartAt || !leaveEndAt) {
      return NextResponse.json({ 
        error: 'Student ID, leave start date, and leave end date are required' 
      }, { status: 400 })
    }

    // Get the student who is going on leave
    const studentOnLeave = await db.student.findUnique({
      where: { id: studentId },
      include: {
        assignedDuties: {
          where: {
            date: {
              gte: new Date(leaveStartAt),
              lte: new Date(leaveEndAt)
            }
          },
          include: {
            kitchenHistory: true
          }
        }
      }
    })

    if (!studentOnLeave) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Get all active kitchen students (excluding the one on leave)
    const activeKitchenStudents = await db.student.findMany({
      where: {
        workType: 'KITCHEN',
        status: 'ACTIVE',
        id: { not: studentId }
      },
      orderBy: { totalDuties: 'asc' } // Prioritize students with fewer duties
    })

    if (activeKitchenStudents.length === 0) {
      return NextResponse.json({ 
        error: 'No active kitchen students available for replacement' 
      }, { status: 400 })
    }

    const replacements = []

    // For each duty during the leave period, find a replacement
    for (const duty of studentOnLeave.assignedDuties) {
      // Find the best replacement (student with fewest duties who is available)
      const availableStudents = activeKitchenStudents.filter(student => {
        // Check if student is not already assigned to this date
        return !student.assignedDuties.some(assignedDuty => 
          assignedDuty.date.getTime() === duty.date.getTime()
        )
      })

      if (availableStudents.length > 0) {
        const replacement = availableStudents[0] // Take the one with fewest duties
        
        // Update the duty assignment
        await db.kitchenDutyAssignment.update({
          where: { id: duty.id },
          data: {
            studentId: replacement.id,
            role: 'REPLACEMENT'
          }
        })

        // Update the replacement student's total duties
        await db.student.update({
          where: { id: replacement.id },
          data: {
            totalDuties: replacement.totalDuties + 1
          }
        })

        // Update the original student's total duties
        await db.student.update({
          where: { id: studentId },
          data: {
            totalDuties: Math.max(0, studentOnLeave.totalDuties - 1)
          }
        })

        replacements.push({
          date: duty.date,
          originalStudent: studentOnLeave.name,
          replacementStudent: replacement.name,
          teamName: duty.kitchenHistory?.teamName || 'Unknown Team'
        })

        // Remove this student from available list for this date
        const studentIndex = activeKitchenStudents.findIndex(s => s.id === replacement.id)
        if (studentIndex > -1) {
          activeKitchenStudents.splice(studentIndex, 1)
        }
      }
    }

    return NextResponse.json({
      message: 'Kitchen team regenerated successfully',
      replacements,
      totalReplacements: replacements.length
    })

  } catch (error) {
    console.error('Error auto-generating kitchen team:', error)
    return NextResponse.json({ 
      error: 'Failed to auto-generate kitchen team' 
    }, { status: 500 })
  }
}