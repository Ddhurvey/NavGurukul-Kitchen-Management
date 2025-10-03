#!/bin/bash

# NavGurukul Kitchen - Discord Notification Cron Jobs Setup
# This script sets up automatic Discord notifications

echo "🍽️  Setting up NavGurukul Kitchen Discord Notifications..."

# Check if CRON_SECRET is set
if [ -z "$CRON_SECRET" ]; then
    echo "❌ Error: CRON_SECRET environment variable is not set"
    echo "Please set a secure cron secret in your environment variables"
    exit 1
fi

# Get the app URL
if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
    echo "⚠️  Warning: NEXT_PUBLIC_APP_URL not set, using localhost:3000"
    APP_URL="http://localhost:3000"
else
    APP_URL="$NEXT_PUBLIC_APP_URL"
fi

echo "📡 Setting up cron jobs for: $APP_URL"

# Create cron entries
cat > /tmp/kitchen_cron.txt << EOF
# NavGurukul Kitchen Discord Notifications
# Daily at 9 PM - Send tomorrow's kitchen team
0 21 * * * curl -X POST "$APP_URL/api/cron/notifications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -d '{"type": "daily-team"}' \
  >> /var/log/kitchen_notifications.log 2>&1

# Saturday at 9 AM - Send Sunday's kitchen team with special menu
0 9 * * 6 curl -X POST "$APP_URL/api/cron/notifications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -d '{"type": "saturday-special"}' \
  >> /var/log/kitchen_notifications.log 2>&1
EOF

# Install cron jobs
echo "📅 Installing cron jobs..."
crontab /tmp/kitchen_cron.txt

if [ $? -eq 0 ]; then
    echo "✅ Cron jobs installed successfully!"
    echo ""
    echo "📋 Active cron jobs:"
    crontab -l | grep kitchen
    echo ""
    echo "📝 Log file: /var/log/kitchen_notifications.log"
    echo ""
    echo "🔔 Notification Schedule:"
    echo "  • Daily at 9:00 PM - Tomorrow's kitchen team"
    echo "  • Saturday at 9:00 AM - Sunday's kitchen team + special menu"
    echo ""
    echo "⚙️  To test manually:"
    echo "  curl -X POST \"$APP_URL/api/notifications/send\" \\"
    echo "    -H \"Content-Type: application/json\" \\"
    echo "    -H \"Authorization: Bearer YOUR_SESSION_TOKEN\" \\"
    echo "    -d '{\"type\": \"menu\"}'"
    echo ""
    echo "🧪 To test Discord connection:"
    echo "  curl -X POST \"$APP_URL/api/discord-message/test\""
    echo ""
else
    echo "❌ Failed to install cron jobs"
    echo "Please check your permissions and try again"
    exit 1
fi

# Clean up
rm -f /tmp/kitchen_cron.txt

echo "🎉 Setup complete! Your Discord notifications are now active."
echo ""
echo "📖 Next steps:"
echo "  1. Ensure your Discord webhook/bot is configured"
echo "  2. Update user Discord IDs in src/lib/discord.ts"
echo "  3. Test the bell icon functionality in the web app"
echo "  4. Monitor logs for any issues"