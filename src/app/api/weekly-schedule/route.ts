import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getWeekNumber, getStartOfWeek, getEndOfWeek } from '@/lib/utils';

// GET current week's schedule or specific week
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get('week');
    const yearParam = searchParams.get('year');
    
    const now = new Date();
    const weekNumber = weekParam ? parseInt(weekParam) : getWeekNumber(now);
    const year = yearParam ? parseInt(yearParam) : now.getFullYear();
    
    // Find weekly schedule
    const weeklySchedule = await db.weeklySchedule.findUnique({
      where: {
        weekNumber_year: {
          weekNumber,
          year
        }
      },
      include: {
        dailySchedules: {
          include: {
            teamAssignments: {
              include: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    foodPreference: true
                  }
                },
                assignedByUser: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          },
          orderBy: {
            date: 'asc'
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approvedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!weeklySchedule) {
      // Return empty weekly schedule structure
      const startDate = getStartOfWeek(now);
      const endDate = getEndOfWeek(now);
      
      return NextResponse.json({
        weekNumber,
        year,
        startDate,
        endDate,
        status: 'DRAFT',
        dailySchedules: [],
        message: 'No weekly schedule found for this week'
      });
    }
    
    return NextResponse.json(weeklySchedule);
  } catch (error) {
    console.error('Error fetching weekly schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly schedule' },
      { status: 500 }
    );
  }
}

// POST create new weekly schedule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { weekNumber, year, createdBy, notes, dailySchedules } = body;
    
    // Check if weekly schedule already exists
    const existingSchedule = await db.weeklySchedule.findUnique({
      where: {
        weekNumber_year: {
          weekNumber,
          year
        }
      }
    });
    
    if (existingSchedule) {
      return NextResponse.json(
        { error: 'Weekly schedule already exists for this week' },
        { status: 400 }
      );
    }
    
    const now = new Date();
    const startDate = getStartOfWeek(now);
    const endDate = getEndOfWeek(now);
    
    // Create weekly schedule
    const weeklySchedule = await db.weeklySchedule.create({
      data: {
        weekNumber,
        year,
        startDate,
        endDate,
        createdBy,
        notes: notes || null,
        status: 'DRAFT'
      }
    });
    
    // Create daily schedules if provided
    if (dailySchedules && dailySchedules.length > 0) {
      await Promise.all(
        dailySchedules.map(async (schedule: any) => {
          const dailySchedule = await db.dailySchedule.create({
            data: {
              weeklyScheduleId: weeklySchedule.id,
              date: new Date(schedule.date),
              teamSize: schedule.teamSize || 4,
              requiredSkills: schedule.requiredSkills || null,
              specialNotes: schedule.specialNotes || null,
              status: 'PENDING'
            }
          });
          
          // Create team assignments if provided
          if (schedule.teamAssignments && schedule.teamAssignments.length > 0) {
            await Promise.all(
              schedule.teamAssignments.map(async (assignment: any) => {
                await db.teamAssignment.create({
                  data: {
                    dailyScheduleId: dailySchedule.id,
                    studentId: assignment.studentId,
                    role: assignment.role || 'MEMBER',
                    isLeader: assignment.isLeader || false,
                    assignedBy: createdBy,
                    notes: assignment.notes || null
                  }
                });
              })
            );
          }
        })
      );
    }
    
    // Fetch the complete weekly schedule
    const completeWeeklySchedule = await db.weeklySchedule.findUnique({
      where: { id: weeklySchedule.id },
      include: {
        dailySchedules: {
          include: {
            teamAssignments: {
              include: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    foodPreference: true
                  }
                }
              }
            }
          },
          orderBy: {
            date: 'asc'
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    return NextResponse.json(completeWeeklySchedule, { status: 201 });
  } catch (error) {
    console.error('Error creating weekly schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create weekly schedule' },
      { status: 500 }
    );
  }
}

// PUT update weekly schedule
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, approvedBy, notes, dailySchedules } = body;
    
    // Update weekly schedule
    const updateData: any = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (approvedBy && status === 'APPROVED') {
      updateData.approvedBy = approvedBy;
      updateData.approvedAt = new Date();
    }
    
    const weeklySchedule = await db.weeklySchedule.update({
      where: { id },
      data: updateData,
      include: {
        dailySchedules: {
          include: {
            teamAssignments: {
              include: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    foodPreference: true
                  }
                }
              }
            }
          },
          orderBy: {
            date: 'asc'
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approvedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Update daily schedules if provided
    if (dailySchedules && dailySchedules.length > 0) {
      await Promise.all(
        dailySchedules.map(async (schedule: any) => {
          if (schedule.id) {
            // Update existing schedule
            await db.dailySchedule.update({
              where: { id: schedule.id },
              data: {
                teamSize: schedule.teamSize,
                requiredSkills: schedule.requiredSkills,
                specialNotes: schedule.specialNotes,
                status: schedule.status
              }
            });
            
            // Update team assignments
            if (schedule.teamAssignments) {
              // Delete existing assignments
              await db.teamAssignment.deleteMany({
                where: { dailyScheduleId: schedule.id }
              });
              
              // Create new assignments
              await Promise.all(
                schedule.teamAssignments.map(async (assignment: any) => {
                  await db.teamAssignment.create({
                    data: {
                      dailyScheduleId: schedule.id,
                      studentId: assignment.studentId,
                      role: assignment.role || 'MEMBER',
                      isLeader: assignment.isLeader || false,
                      assignedBy: weeklySchedule.createdBy,
                      notes: assignment.notes || null
                    }
                  });
                })
              );
            }
          } else {
            // Create new schedule
            const dailySchedule = await db.dailySchedule.create({
              data: {
                weeklyScheduleId: weeklySchedule.id,
                date: new Date(schedule.date),
                teamSize: schedule.teamSize || 4,
                requiredSkills: schedule.requiredSkills || null,
                specialNotes: schedule.specialNotes || null,
                status: schedule.status || 'PENDING'
              }
            });
            
            // Create team assignments
            if (schedule.teamAssignments && schedule.teamAssignments.length > 0) {
              await Promise.all(
                schedule.teamAssignments.map(async (assignment: any) => {
                  await db.teamAssignment.create({
                    data: {
                      dailyScheduleId: dailySchedule.id,
                      studentId: assignment.studentId,
                      role: assignment.role || 'MEMBER',
                      isLeader: assignment.isLeader || false,
                      assignedBy: weeklySchedule.createdBy,
                      notes: assignment.notes || null
                    }
                  });
                })
              );
            }
          }
        })
      );
    }
    
    return NextResponse.json(weeklySchedule);
  } catch (error) {
    console.error('Error updating weekly schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update weekly schedule' },
      { status: 500 }
    );
  }
}