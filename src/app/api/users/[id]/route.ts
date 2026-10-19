import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = params.id
    if (userId !== decoded.userId && decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get user profile with kitchen and leave history
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        kitchenTurns: {
          include: {
            kitchenTurn: {
              include: {
                assignedStudents: {
                  include: {
                    student: true
                  }
                },
                teamLeader: true
              }
            }
          },
          orderBy: {
            kitchenTurn: {
              date: 'desc'
            }
          }
        },
        leaves: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        leaveRequests: {
          include: {
            replacementStudent: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Format kitchen history
    const kitchenHistory = user.kitchenTurns.map(turn => ({
      id: turn.id,
      date: turn.kitchenTurn.date,
      teamMembers: turn.kitchenTurn.assignedStudents.map(assignment => assignment.student.name),
      menu: [], // This would come from FoodMenu table if available
      status: turn.kitchenTurn.status,
      wasLeader: turn.kitchenTurn.teamLeaderId === userId,
      notes: turn.kitchenTurn.notes
    }))

    // Format leave history (combine leaves and leave requests)
    const leaveHistory = [
      ...user.leaves.map(leave => ({
        id: leave.id,
        startDate: leave.startDate,
        endDate: leave.endDate,
        reason: leave.reason,
        status: leave.status,
        replacementStudent: null,
        type: 'leave'
      })),
      ...user.leaveRequests.map(request => ({
        id: request.id,
        startDate: request.date,
        endDate: request.date,
        reason: request.reason,
        status: request.status,
        replacementStudent: request.replacementStudent,
        type: 'request'
      }))
    ].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

    const userProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      foodPreference: user.foodPreference,
      totalKitchenTurns: user.totalKitchenTurns,
      leaveDays: user.leaveDays,
      discordId: user.discordId,
      photoUrl: user.photoUrl,
      createdAt: user.createdAt,
      kitchenHistory,
      leaveHistory
    }

    return NextResponse.json({ user: userProfile })

  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}