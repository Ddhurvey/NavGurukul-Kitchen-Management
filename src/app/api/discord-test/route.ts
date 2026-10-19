import { NextRequest, NextResponse } from 'next/server';
import { sendDiscordNotification } from '@/lib/discord';
import { requireRole } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN'])
  if (!auth.user) return auth.response
  try {
    const testMessage = `🍽️ NavGurukul Kitchen System Test - ${new Date().toLocaleString()}

🧪 This is a test message to verify the Discord notification system is working correctly.

✅ Features Available:
• Manual notifications via bell icon (Admin, FC, Team Member)
• Automatic daily 9 PM notifications
• Saturday 9 AM special notifications
• Real Discord user mentions (@mentions)
• Formatted messages with emojis

🔔 Ready to use! The bell icon should now be visible for authorized users.

📅 Next steps:
1. Update Discord user IDs in src/lib/discord.ts
2. Set up cron jobs with: npm run setup:discord
3. Test the bell icon in the web interface

System Status: ✅ ONLINE
Webhook Status: ✅ CONNECTED
Message Type: TEST NOTIFICATION`;

    const result = await sendDiscordNotification(testMessage);

    return NextResponse.json({ 
      success: true, 
      message: 'Test notification sent successfully!',
      discordResult: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json({ 
      error: 'Failed to send test notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}