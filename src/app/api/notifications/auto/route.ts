import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendDiscordNotification } from '@/lib/discord';
import { formatKitchenTeamMessage, formatSundaySpecialMessage } from '@/lib/discord';

export async function POST(request: NextRequest) {
  try {
    // Verify cron job secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { type } = data; // 'daily' or 'saturday'

    const today = new Date();
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDayOfWeek = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });

    let message = '';

    if (type === 'daily') {
      // Daily 9 PM: Send tomorrow's kitchen team
      const kitchenTurn = await db.kitchenTurn.findFirst({
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

      if (!kitchenTurn) {
        return NextResponse.json({ error: 'No team data found for tomorrow' }, { status: 404 });
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

    } else if (type === 'saturday') {
      // Saturday 9 AM: Send Sunday's kitchen team + menu (with egg/paneer rule)
      const sunday = new Date(today);
      sunday.setDate(sunday.getDate() + 1);

      const kitchenTurn = await db.kitchenTurn.findFirst({
        where: {
          date: sunday.toISOString().split('T')[0]
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

      const menu = await db.foodMenu.findFirst({
        where: {
          date: sunday.toISOString().split('T')[0]
        }
      });

      if (!kitchenTurn) {
        return NextResponse.json({ error: 'No team data found for Sunday' }, { status: 404 });
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

      // Check Sunday rule: Ensure at least 1 egg-eater is included
      const hasEggEater = teamUsers.some(user => user.foodPreference === 'EGGS');
      if (!hasEggEater) {
        console.warn('⚠️ Sunday team warning: No egg-eater found in the team');
      }

      // Format message with Discord mentions
      message = formatSundaySpecialMessage(teamUsers, menu);
    }

    // Send to Discord
    const result = await sendDiscordNotification(message);

    return NextResponse.json({ 
      success: true, 
      message: 'Automatic notification sent successfully',
      discordResult: result
    });

  } catch (error) {
    console.error('Automatic notification error:', error);
    return NextResponse.json({ 
      error: 'Failed to send automatic notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}