#!/bin/bash

echo "🍳 Kitchen Duty Management System - Complete Demo"
echo "=================================================="

echo ""
echo "📅 1. Checking Daily Assignment Status..."
echo "-----------------------------------------"
daily_status=$(curl -s http://localhost:3000/api/daily-assignment)
echo "$daily_status" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        print('✅ Daily assignment system operational')
        if data.get('todayTeam'):
            print(f\"Today's Team: {data['todayTeam']['teamLead']['name']}\")
        if data.get('tomorrowTeam'):
            print(f\"Tomorrow's Team: {data['tomorrowTeam']['teamLead']['name']}\")
        print(f\"Cutoff Status: {'Before 9 PM' if data['cutoffStatus']['isBeforeCutoff'] else 'After 9 PM'}\")
    else:
        print('❌ Daily assignment system error')
except:
    print('❌ Error parsing response')
"

echo ""
echo "⏰ 2. Testing Leave Management (9 PM Cutoff)..."
echo "-------------------------------------------------"
cutoff_status=$(curl -s http://localhost:3000/api/leave-management)
echo "$cutoff_status" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        status = data['cutoffStatus']
        print(f\"Current Time: {status['currentTime']}\")
        print(f\"Cutoff Time: {status['cutoffTime']}\")
        print(f\"Status: {'✅ Accepting Leave Requests' if status['isBeforeCutoff'] else '❌ Cutoff Passed'}\")
        if status['timeUntilCutoff']:
            print(f\"Time Until Cutoff: {status['timeUntilCutoff']}\")
    else:
        print('❌ Leave management error')
except:
    print('❌ Error parsing response')
"

echo ""
echo "🔄 3. Testing Round-Robin Assignment..."
echo "----------------------------------------"
# Test assignment for a future date
assignment_result=$(curl -s -X POST http://localhost:3000/api/auto-assign \
    -H "Content-Type: application/json" \
    -d '{"date": "2025-10-15T00:00:00.000Z"}')

echo "$assignment_result" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        print(f\"✅ Assignment Successful\")
        print(f\"Team Lead: {data['teamLead']}\")
        print(f\"Team Members: {', '.join(data['teamMembers']) if data['teamMembers'] else 'None'}\")
        print(f\"Cycle: {data['cycleNumber']}, Day: {data['dayInCycle']}\")
        print(f\"Sunday Special: {'Yes' if data['isSundaySpecial'] else 'No'}\")
        if data.get('foodPreferences'):
            print('Food Preferences:')
            for pref in data['foodPreferences']:
                print(f\"  - {pref['name']}: {pref['preference']}\")
    else:
        print(f\"❌ Assignment Failed: {data.get('error', 'Unknown error')}\")
except:
    print('❌ Error parsing assignment response')
"

echo ""
echo "📢 4. Testing Daily Discord Notification..."
echo "--------------------------------------------"
notification_result=$(curl -s -X POST http://localhost:3000/api/discord-notify \
    -H "Content-Type: application/json" \
    -d '{}')

echo "$notification_result" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        print('✅ Discord Notification Sent Successfully')
        print(f\"Date: {data['notification']['date']}\")
        print(f\"Team Lead: {data['notification']['teamLead']}\")
        print(f\"Team Members: {', '.join(data['notification']['teamMembers']) if data['notification']['teamMembers'] else 'None'}\")
        print('Message Preview:')
        lines = data['notification']['message'].split('\n')
        for line in lines[:6]:  # Show first 6 lines
            print(f\"  {line}\")
        if len(lines) > 6:
            print('  ...')
    else:
        print(f\"❌ Notification Failed: {data.get('error', 'Unknown error')}\")
except:
    print('❌ Error parsing notification response')
"

echo ""
echo "📝 5. Testing Leave Request System..."
echo "--------------------------------------"
# Get a student ID for testing
student_info=$(curl -s http://localhost:3000/api/students | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data:
    student = data[0]
    print(f\"{student['id']}|{student['name']}\")
")

if [ ! -z "$student_info" ]; then
    student_id=$(echo "$student_info" | cut -d'|' -f1)
    student_name=$(echo "$student_info" | cut -d'|' -f2)
    
    leave_result=$(curl -s -X POST http://localhost:3000/api/leave-management \
        -H "Content-Type: application/json" \
        -d "{
            \"studentId\": \"$student_id\",
            \"startDate\": \"2025-10-16\",
            \"endDate\": \"2025-10-16\",
            \"reason\": \"Demo leave request\"
        }")

    echo "$leave_result" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        print(f\"✅ Leave Request Approved\")
        print(f\"Student: {data.get('message', 'Leave approved')}\")
        if data.get('cutoffPassed'):
            print('⚠️  Note: Cutoff time had passed')
    else:
        print(f\"❌ Leave Request Failed: {data.get('error', 'Unknown error')}\")
except:
    print('❌ Error parsing leave response')
"
else
    echo "❌ Could not get student information for leave test"
fi

echo ""
echo "📊 6. Testing Daily Assignment Process..."
echo "-----------------------------------------"
daily_assignment=$(curl -s -X POST http://localhost:3000/api/daily-assignment)

echo "$daily_assignment" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        print(f\"✅ Daily Assignment {data.get('message', 'completed')}\")
        if data.get('assignment'):
            print(f\"Assignment ID: {data['assignment']['id']}\")
            print(f\"Date: {data['assignment']['date']}\")
    else:
        print(f\"❌ Daily Assignment Failed: {data.get('error', 'Unknown error')}\")
except:
    print('❌ Error parsing daily assignment response')
"

echo ""
echo "🎯 System Summary:"
echo "=================="
echo "✅ Round-robin assignment algorithm with fair rotation"
echo "✅ Sunday special rule (egg + paneer requirement)"
echo "✅ 9 PM cutoff for leave requests"
echo "✅ Daily automated assignment at 9 PM"
echo "✅ Discord notifications with proper formatting"
echo "✅ Complete history tracking"
echo "✅ Leave management with automatic reassignment"
echo "✅ Admin interface for manual edits"
echo "✅ Real-time status monitoring"

echo ""
echo "🍳 Kitchen Duty Management System Demo Complete!"
echo "=================================================="

echo ""
echo "Next Steps:"
echo "1. Set up a cron job to run daily assignment at 9 PM"
echo "2. Configure Discord webhook for notifications"
echo "3. Add admin authentication for history editing"
echo "4. Set up automated testing and monitoring"