import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendDiscordNotification } from '@/lib/discord';
import { formatTodayMenuNotification, formatKitchenTeamMessage } from '@/lib/discord';

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a trusted source (cron job)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDayOfWeek = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });

    // Send tomorrow's kitchen team notification (daily automatic)
    let kitchenTurn = await db.kitchenTurn.findFirst({
      where: {
        date: tomorrow.toISOString().split('T')[0]
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
            date: tomorrow,
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

    // Get tomorrow's food menu
    const foodMenu = await db.foodMenu.findFirst({
      where: {
        date: tomorrow.toISOString().split('T')[0]
      }
    });

    // If no food menu for tomorrow, create one
    let tomorrowMenu = foodMenu;
    if (!tomorrowMenu) {
      // Get a valid admin user ID
      const adminUser = await db.user.findFirst({
        where: { role: 'ADMIN' }
      });
      
      if (!adminUser) {
        // If no admin, get any active user
        const anyUser = await db.user.findFirst({
          where: { status: 'ACTIVE' }
        });
        
        if (!anyUser) {
          return NextResponse.json(
            { error: 'No active users found to create food menu' },
            { status: 500 }
          )
        }
        
        tomorrowMenu = await db.foodMenu.create({
          data: {
            date: tomorrow,
            breakfast: 'Poha',
            lunch: 'Dal + Rice',
            snacks: 'Samosa',
            dinner: 'Veg + Roti',
            updatedBy: anyUser.id
          }
        });
      } else {
        tomorrowMenu = await db.foodMenu.create({
          data: {
            date: tomorrow,
            breakfast: 'Poha',
            lunch: 'Dal + Rice',
            snacks: 'Samosa',
            dinner: 'Veg + Roti',
            updatedBy: adminUser.id
          }
        });
      }
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
    let message = '';
    if (tomorrowMenu) {
      message = formatTodayMenuNotification(tomorrowMenu, teamUsers, tomorrowDayOfWeek);
    } else {
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
      message: 'Daily automatic notification sent successfully',
      discordResult: result,
      data: {
        date: tomorrow.toISOString().split('T')[0],
        kitchenTurn: kitchenTurn.id,
        foodMenu: tomorrowMenu?.id
      }
    });

  } catch (error) {
    console.error('Daily notification error:', error);
    return NextResponse.json({ 
      error: 'Failed to send daily notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint for manual testing
export async function GET() {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return NextResponse.json({ 
      message: 'Daily notification endpoint is working',
      nextScheduledDate: tomorrow.toISOString().split('T')[0],
      instructions: 'Send POST request with Authorization header to trigger daily notification'
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Endpoint test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}