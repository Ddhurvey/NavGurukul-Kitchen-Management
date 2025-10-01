#!/bin/bash

# Daily Kitchen Duty Auto-Assignment Script
# This script should be run once per day (e.g., via cron job at 9 PM)

echo "🍳 Starting Daily Kitchen Duty Auto-Assignment..."
echo "📅 Date: $(date '+%Y-%m-%d %H:%M:%S')"

# Call the daily auto-assign API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/daily-auto-assign \
  -H "Content-Type: application/json" \
  -w "\n%{http_code}")

# Extract HTTP code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

# Extract response body (everything except last line)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

echo "📊 Response Code: $HTTP_CODE"
echo "📝 Response: $RESPONSE_BODY"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Daily auto-assignment completed successfully!"
  
  # Check if it was already assigned
  if echo "$RESPONSE_BODY" | grep -q "already assigned"; then
    echo "ℹ️  Tomorrow's duty was already assigned"
  else
    echo "🎉 Tomorrow's kitchen duty has been assigned!"
  fi
else
  echo "❌ Failed to auto-assign kitchen duty"
  echo "🔍 Check the server logs for more details"
  exit 1
fi

echo "🏁 Daily auto-assignment process completed at $(date '+%Y-%m-%d %H:%M:%S')"