#!/bin/bash

# Kitchen Duty Daily Assignment Cron Job
# This script should be scheduled to run at 9:00 PM daily
# Add to crontab: 0 21 * * * /path/to/kitchen-duty-daily-assignment.sh

LOG_FILE="/home/z/my-project/logs/daily-assignment.log"
API_BASE="http://localhost:3000"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

log_message "Starting daily kitchen duty assignment..."

# Step 1: Perform daily assignment
log_message "Step 1: Performing daily assignment..."
assignment_response=$(curl -s -X POST "$API_BASE/api/daily-assignment")

if echo "$assignment_response" | grep -q '"success":true'; then
    log_message "✅ Daily assignment completed successfully"
    assignment_details=$(echo "$assignment_response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        msg = data.get('message', 'Unknown')
        log_msg = f'Assignment: {msg}'
        if data.get('assignment'):
            assignment = data['assignment']
            log_msg += f' | Date: {assignment.get(\"date\", \"Unknown\")}'
            log_msg += f' | Cycle: {assignment.get(\"cycleNumber\", \"?\")}'
        print(log_msg)
except:
    print('Error parsing assignment response')
")
    log_message "$assignment_details"
else
    log_message "❌ Daily assignment failed"
    log_message "Response: $assignment_response"
fi

# Step 2: Send Discord notification
log_message "Step 2: Sending Discord notification..."
notification_response=$(curl -s -X POST "$API_BASE/api/discord-notify" -H "Content-Type: application/json" -d '{}')

if echo "$notification_response" | grep -q '"success":true'; then
    log_message "✅ Discord notification sent successfully"
    notification_details=$(echo "$notification_response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        notification = data.get('notification', {})
        date = notification.get('date', 'Unknown')
        team_lead = notification.get('teamLead', 'Unknown')
        members = notification.get('teamMembers', [])
        members_str = ', '.join(members) if members else 'None'
        print(f'Notification sent for {date} | Team Lead: {team_lead} | Members: {members_str}')
except:
    print('Error parsing notification response')
")
    log_message "$notification_details"
else
    log_message "❌ Discord notification failed"
    log_message "Response: $notification_response"
fi

# Step 3: Check system status
log_message "Step 3: Checking system status..."
status_response=$(curl -s "$API_BASE/api/leave-management")

if echo "$status_response" | grep -q '"success":true'; then
    status_details=$(echo "$status_response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        status = data.get('cutoffStatus', {})
        current_time = status.get('currentTime', 'Unknown')
        cutoff_time = status.get('cutoffTime', 'Unknown')
        is_before = status.get('isBeforeCutoff', False)
        print(f'System Status - Current: {current_time} | Cutoff: {cutoff_time} | Accepting Leaves: {is_before}')
except:
    print('Error parsing status response')
")
    log_message "$status_details"
else
    log_message "❌ System status check failed"
fi

log_message "Daily kitchen duty assignment process completed."
log_message "==============================================="

# Optional: Send email notification to admin on failure
if ! echo "$assignment_response" | grep -q '"success":true' || \
   ! echo "$notification_response" | grep -q '"success":true'; then
    log_message "⚠️  Process completed with errors - admin notification recommended"
    # Add email notification logic here if needed
fi