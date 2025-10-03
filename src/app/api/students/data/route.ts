import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('includeStats') === 'true'
    const eligibleOnly = searchParams.get('eligibleOnly') === 'true'

    // Get all active students
    const allActiveStudents = await db.user.findMany({
      where: {
        status: 'ACTIVE'
      },
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        foodPreference: true,
        totalKitchenTurns: true,
        leaveDays: true,
        rotationPosition: true,
        lastTurnDate: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Filter for kitchen eligible students (exclude FC and TEAM_MEMBER)
    const kitchenEligibleStudents = eligibleOnly 
      ? allActiveStudents.filter(student => student.role === 'STUDENT')
      : allActiveStudents

    // Get current leave data
    const currentLeaves = await db.leave.findMany({
      where: {
        status: 'APPROVED',
        startDate: {
          lte: new Date()
        },
        endDate: {
          gte: new Date()
        }
      },
      select: {
        studentId: true,
        startDate: true,
        endDate: true,
        reason: true
      }
    })

    const leaveStudentIds = new Set(currentLeaves.map(leave => leave.studentId))

    // Mark students who are currently on leave
    const studentsWithLeaveStatus = kitchenEligibleStudents.map(student => ({
      ...student,
      isOnLeave: leaveStudentIds.has(student.id),
      worksInKitchen: student.role === 'STUDENT' ? 'Kitchen' : 'None',
      leaveDetails: currentLeaves.find(leave => leave.studentId === student.id)
    }))

    if (!includeStats) {
      return NextResponse.json({
        students: studentsWithLeaveStatus
      })
    }

    // Calculate statistics
    const totalActive = allActiveStudents.length
    const totalEggs = allActiveStudents.filter(s => s.foodPreference === 'EGGS').length
    const totalPaneer = allActiveStudents.filter(s => s.foodPreference === 'PANEER').length
    const totalOnLeave = currentLeaves.length
    const kitchenEligible = kitchenEligibleStudents.length
    const teamMembers = allActiveStudents.filter(s => s.role === 'TEAM_MEMBER').length
    const fcCount = allActiveStudents.filter(s => s.role === 'FC').length

    // Food preference breakdown for eligible students
    const eligibleEggs = kitchenEligibleStudents.filter(s => s.foodPreference === 'EGGS').length
    const eligiblePaneer = kitchenEligibleStudents.filter(s => s.foodPreference === 'PANEER').length

    // Kitchen work statistics
    const eligibleOnLeave = studentsWithLeaveStatus.filter(s => s.isOnLeave).length
    const availableForKitchen = studentsWithLeaveStatus.filter(s => !s.isOnLeave).length

    const statistics = {
      totalActive,
      foodPreferences: {
        eggs: totalEggs,
        paneer: totalPaneer
      },
      leave: {
        currentlyOnLeave: totalOnLeave,
        leaveStudentIds: Array.from(leaveStudentIds)
      },
      kitchenEligibility: {
        totalEligible: kitchenEligible,
        availableForKitchen,
        eligibleOnLeave,
        teamMembers,
        fcCount
      },
      eligibleFoodPreferences: {
        eggs: eligibleEggs,
        paneer: eligiblePaneer
      },
      roleBreakdown: {
        students: allActiveStudents.filter(s => s.role === 'STUDENT').length,
        teamMembers: teamMembers,
        fc: fcCount
      }
    }

    return NextResponse.json({
      statistics,
      students: studentsWithLeaveStatus,
      currentLeaves,
      lastUpdated: new Date()
    })
  } catch (error) {
    console.error('Error fetching student data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, studentId, data } = await request.json()

    switch (action) {
      case 'update_kitchen_work':
        // Update student's kitchen work eligibility
        const updatedStudent = await db.user.update({
          where: { id: studentId },
          data: {
            role: data.role,
            updatedAt: new Date()
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            foodPreference: true,
            totalKitchenTurns: true,
            leaveDays: true,
            updatedAt: true
          }
        })

        // Log the change
        await db.historyLog.create({
          data: {
            action: 'STUDENT_KITCHEN_WORK_UPDATED',
            updatedBy: 'SYSTEM',
            metadata: JSON.stringify({
              studentId,
              previousRole: data.previousRole,
              newRole: data.role,
              updatedBy: data.updatedBy
            })
          }
        })

        return NextResponse.json({
          success: true,
          message: 'Student kitchen work updated successfully',
          student: updatedStudent
        })

      case 'bulk_update':
        // Bulk update multiple students
        const { updates } = data
        const results = await Promise.all(
          updates.map(async (update: any) => {
            return await db.user.update({
              where: { id: update.studentId },
              data: {
                role: update.role,
                foodPreference: update.foodPreference,
                updatedAt: new Date()
              }
            })
          })
        )

        // Log bulk update
        await db.historyLog.create({
          data: {
            action: 'BULK_STUDENT_UPDATE',
            updatedBy: 'SYSTEM',
            metadata: JSON.stringify({
              updatedCount: results.length,
              updates: updates.map((u: any) => ({
                studentId: u.studentId,
                newRole: u.role,
                newPreference: u.foodPreference
              }))
            })
          }
        })

        return NextResponse.json({
          success: true,
          message: `Updated ${results.length} students successfully`,
          students: results
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error updating student data:', error)
    return NextResponse.json(
      { error: 'Failed to update student data' },
      { status: 500 }
    )
  }
}