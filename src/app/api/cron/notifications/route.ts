import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Verify cron job secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { type } = data; // 'daily-team' or 'saturday-special'

    const today = new Date();
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
    const hours = today.getHours();

    // Call the appropriate notification API
    let notificationType = '';
    
    if (type === 'daily-team' && hours === 21) { // 9 PM
      notificationType = 'team';
    } else if (type === 'saturday-special' && dayOfWeek === 'Saturday' && hours === 9) { // Saturday 9 AM
      notificationType = 'team';
    } else {
      return NextResponse.json({ error: 'Invalid cron schedule' }, { status: 400 });
    }

    // Call the notification API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/auto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      },
      body: JSON.stringify({ 
        type: type === 'saturday-special' ? 'saturday' : 'daily' 
      })
    });

    if (response.ok) {
      const result = await response.json();
      return NextResponse.json({ 
        success: true, 
        message: 'Cron job executed successfully',
        result 
      });
    } else {
      const error = await response.json();
      return NextResponse.json({ 
        error: 'Failed to execute cron job',
        details: error 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ 
      error: 'Failed to execute cron job',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}