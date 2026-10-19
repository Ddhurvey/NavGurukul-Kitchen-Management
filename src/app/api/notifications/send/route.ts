import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendDiscordNotification } from '@/lib/discord';
import { formatTodayMenuNotification, formatKitchenTeamMessage } from '@/lib/discord';
import { requireRole } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    // For now, allow without token for testing, but require proper roles in production
    let user = null;
    
    if (token) {
      const decoded = await verifyToken(token);
      if (decoded) {
        user = await db.user.findUnique({
          where: { id: decoded.userId }
        });
      }
    }

    // Allow access if: no user (testing), or user has proper roles
    if (user && !['ADMIN', 'FC', 'TEAM_MEMBER', 'TEAM_LEADER'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const data = await request.json();
    const { type } = data; // 'menu' or 'team'

    const today = new Date();
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDayOfWeek = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });

    let message = '';

    if (type === 'menu') {
      // Send today's menu + kitchen team
      const todayStr = today.toISOString().split('T')[0];
      const menu = await db.foodMenu.findFirst({
        where: {
          date: new Date(todayStr + 'T00:00:00.000Z')
        }
      });

      // Get kitchen turn for today
      let kitchenTurn = await db.kitchenTurn.findFirst({
        where: {
          date: new Date(todayStr + 'T00:00:00.000Z')
        },
        include: {
          assignedStudents: {
            include: {
              student: true
            }
          },
          teamLeader: true
        }
      });

      // If no kitchen turn for today, create one
      if (!kitchenTurn) {
        // Get 4 random active students
        const activeStudents = await db.user.findMany({
          where: {
            status: 'ACTIVE',
            role: 'STUDENT'
          },
          take: 4
        })

        if (activeStudents.length > 0) {
          kitchenTurn = await db.kitchenTurn.create({
            data: {
              date: new Date(todayStr + 'T00:00:00.000Z'),
              status: 'PENDING',
              teamLeaderId: activeStudents[0].id
            }
          })

          // Assign students
          await db.kitchenTurnStudent.createMany({
            data: activeStudents.map(student => ({
              kitchenTurnId: kitchenTurn.id,
              studentId: student.id
            }))
          })

          // Refetch with students
          kitchenTurn = await db.kitchenTurn.findUnique({
            where: {
              id: kitchenTurn.id
            },
            include: {
              assignedStudents: {
                include: {
                  student: true
                }
              },
              teamLeader: true
            }
          })
        }
      }

      if (!kitchenTurn) {
        return NextResponse.json({ 
          success: false, 
          error: 'Unable to create kitchen team for today' 
        }, { status: 500 });
      }

      // Prepare team users with Discord data
      const teamUsers: any[] = [];
      
      // Add team leader
      if (kitchenTurn.teamLeader) {
        teamUsers.push({
          ...kitchenTurn.teamLeader,
          isTeamLeader: true
        });
      }
      
      // Add assigned students
      kitchenTurn.assignedStudents.forEach(assignment => {
        if (assignment.student.id !== kitchenTurn.teamLeaderId) {
          teamUsers.push({
            ...assignment.student,
            isTeamLeader: false
          });
        }
      });

      // Format message with Discord mentions
      if (menu) {
        message = formatTodayMenuNotification(menu, teamUsers, dayOfWeek);
      } else {
        // Fallback if no menu - use the same format as team notification
        message = formatKitchenTeamMessage(teamUsers, dayOfWeek);
      }

    } else if (type === 'team') {
      // Send tomorrow's kitchen team
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      let kitchenTurn = await db.kitchenTurn.findFirst({
        where: {
          date: new Date(tomorrowStr + 'T00:00:00.000Z')
        },
        include: {
          assignedStudents: {
            include: {
              student: true
            }
          },
          teamLeader: true
        }
      });

      // If no kitchen turn for tomorrow, create one
      if (!kitchenTurn) {
        // Get 4 random active students
        const activeStudents = await db.user.findMany({
          where: {
            status: 'ACTIVE',
            role: 'STUDENT'
          },
          take: 4
        })

        if (activeStudents.length > 0) {
          kitchenTurn = await db.kitchenTurn.create({
            data: {
              date: new Date(tomorrowStr + 'T00:00:00.000Z'),
              status: 'PENDING',
              teamLeaderId: activeStudents[0].id
            }
          })

          // Assign students
          await db.kitchenTurnStudent.createMany({
            data: activeStudents.map(student => ({
              kitchenTurnId: kitchenTurn.id,
              studentId: student.id
            }))
          })

          // Refetch with students
          kitchenTurn = await db.kitchenTurn.findUnique({
            where: {
              id: kitchenTurn.id
            },
            include: {
              assignedStudents: {
                include: {
                  student: true
                }
              },
              teamLeader: true
            }
          })
        }
      }

      if (!kitchenTurn) {
        return NextResponse.json({ 
          success: false, 
          error: 'Unable to create kitchen team for tomorrow' 
        }, { status: 500 });
      }

      // Prepare team users with Discord data
      const teamUsers: any[] = [];
      
      // Add team leader
      if (kitchenTurn.teamLeader) {
        teamUsers.push({
          ...kitchenTurn.teamLeader,
          isTeamLeader: true
        });
      }
      
      // Add assigned students
      kitchenTurn.assignedStudents.forEach(assignment => {
        if (assignment.student.id !== kitchenTurn.teamLeaderId) {
          teamUsers.push({
            ...assignment.student,
            isTeamLeader: false
          });
        }
      });

      // Format message with Discord mentions
      message = formatKitchenTeamMessage(teamUsers, tomorrowDayOfWeek);
    }

    // Send to Discord
    let result;
    try {
      result = await sendDiscordNotification(message);
    } catch (discordError) {
      console.error('Discord sending failed:', discordError);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to send Discord notification',
        details: discordError instanceof Error ? discordError.message : 'Unknown Discord error'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Notification sent successfully',
      discordResult: result
    });

  } catch (error) {
    console.error('Notification error:', error);
    return NextResponse.json({ 
      error: 'Failed to send notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}