#!/bin/bash

echo "Testing Round-Robin Kitchen Duty Assignment System"
echo "================================================="

# Test multiple consecutive days to verify round-robin rotation
DATES=("2025-10-06" "2025-10-07" "2025-10-08" "2025-10-09")

for date in "${DATES[@]}"; do
    echo ""
    echo "Testing assignment for $date:"
    echo "----------------------------"
    
    response=$(curl -s -X POST http://localhost:3000/api/auto-assign \
        -H "Content-Type: application/json" \
        -d "{\"date\": \"$date\"}")
    
    # Extract team lead name from response
    team_lead=$(echo "$response" | grep -o '"teamLead":"[^"]*"' | cut -d'"' -f4)
    is_sunday=$(echo "$response" | grep -o '"isSundaySpecial":[^,]*' | cut -d':' -f2)
    cycle=$(echo "$response" | grep -o '"cycleNumber":[^,]*' | cut -d':' -f2)
    day_in_cycle=$(echo "$response" | grep -o '"dayInCycle":[^,]*' | cut -d':' -f2)
    
    echo "Team Lead: $team_lead"
    echo "Sunday Special: $is_sunday"
    echo "Cycle: $cycle, Day: $day_in_cycle"
done

echo ""
echo "Testing Sunday Special Assignment (Oct 5, 2025 - Sunday):"
echo "--------------------------------------------------------"

sunday_response=$(curl -s -X POST http://localhost:3000/api/auto-assign \
    -H "Content-Type: application/json" \
    -d '{"date": "2025-10-05T00:00:00.000Z"}')

sunday_team_lead=$(echo "$sunday_response" | grep -o '"teamLead":"[^"]*"' | cut -d'"' -f4)
sunday_members=$(echo "$sunday_response" | grep -o '"teamMembers":\[[^]]*\]' | sed 's/"teamMembers":\[//g' | sed 's/\]//g' | tr ',' '\n' | tr -d '"' | tr -s ' ')
sunday_special=$(echo "$sunday_response" | grep -o '"isSundaySpecial":[^,]*' | cut -d':' -f2)

echo "Sunday Team Lead: $sunday_team_lead"
echo "Sunday Team Members: $sunday_members"
echo "Sunday Special: $sunday_special"

echo ""
echo "Testing Discord Notification:"
echo "----------------------------"

discord_response=$(curl -s -X POST http://localhost:3000/api/discord-notify \
    -H "Content-Type: application/json" \
    -d '{"date": "2025-10-05T00:00:00.000Z"}')

discord_success=$(echo "$discord_response" | grep -o '"success":[^,]*' | cut -d':' -f2)
echo "Discord notification success: $discord_success"

echo ""
echo "Test completed!"