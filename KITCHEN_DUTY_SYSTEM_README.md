# 🍳 Kitchen Duty Management System

A fully automated kitchen duty assignment system with Discord notifications, leave management, and comprehensive history tracking.

## 🎯 Features

### ✅ **Core Functionality**
- **Round-Robin Assignment**: Fair rotation ensuring every student gets equal turns
- **Sunday Special Rule**: Sunday teams always include both egg and paneer preferences
- **9 PM Daily Assignment**: Automated assignment runs every evening at 9 PM
- **Discord Notifications**: Daily notifications sent to Discord channel
- **Leave Management**: Students can request leave with 9 PM cutoff
- **History Tracking**: Complete audit trail of all assignments
- **Admin Interface**: Manual editing capabilities for administrators

### 🔄 **Automation Rules**
1. **Daily 9 PM Assignment**: Automatically assigns tomorrow's kitchen duty
2. **Leave Cutoff**: No changes allowed after 9 PM for next day's duty
3. **Fair Rotation**: No student gets second turn until all have had first turn
4. **Sunday Requirements**: Must include at least 1 egg + 1 paneer preference student
5. **Auto Reassignment**: When someone takes leave, automatically reassigns

## 🛠️ Technical Architecture

### **Database Schema**
```sql
KitchenDuty {
  id, date, teamLeadId, cycleNumber, dayInCycle, isSundaySpecial
  assignments { studentId, isTeamLead }
}

KitchenHistory {
  id, date, teamLeadId, teamMembers[], foodPreferences[]
  status, assignedAt, modifiedAt, modifiedBy, notes
}

Leave {
  id, studentId, startDate, endDate, reason, status
  requestedAt, reviewedAt, reviewedBy
}

DutyRotation {
  id, currentCycle, currentDayInCycle, lastAssignedIndex
  studentQueue[], isActive
}
```

### **API Endpoints**

#### **Assignment Management**
- `POST /api/auto-assign` - Manual assignment for specific date
- `POST /api/daily-assignment` - Trigger daily 9 PM assignment
- `GET /api/daily-assignment` - Get today/today teams + history

#### **Leave Management**
- `POST /api/leave-management` - Submit leave request
- `GET /api/leave-management` - Check cutoff status

#### **Notifications**
- `POST /api/discord-notify` - Send Discord notification
- `GET /api/kitchen-history` - Get assignment history
- `POST /api/kitchen-history` - Edit historical assignments

## 🚀 Setup Instructions

### **1. Database Setup**
```bash
# Push schema to database
npm run db:push

# Seed with sample data
npm run db:seed-real
```

### **2. Environment Variables**
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL=http://localhost:3000
```

### **3. Automated Daily Assignment**
```bash
# Make script executable
chmod +x kitchen-duty-daily-assignment.sh

# Add to crontab for daily 9 PM execution
crontab -e
# Add line: 0 21 * * * /path/to/kitchen-duty-daily-assignment.sh
```

## 📱 Usage Examples

### **Daily Workflow**
1. **9:00 PM**: System automatically assigns tomorrow's duty
2. **9:01 PM**: Discord notification sent with team details
3. **Before 9 PM**: Students can request leave for tomorrow
4. **After 9 PM**: No changes allowed to tomorrow's assignment
5. **Next Day**: Assigned team performs kitchen duty

### **Leave Management**
```bash
# Before 9 PM - Submit leave request
curl -X POST http://localhost:3000/api/leave-management \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "student_id",
    "startDate": "2025-10-05",
    "endDate": "2025-10-05",
    "reason": "Medical emergency"
  }'

# After 9 PM - Request rejected
# Response: {"success": false, "message": "9 PM cutoff has passed"}
```

### **Manual Assignment**
```bash
# Assign for specific date
curl -X POST http://localhost:3000/api/auto-assign \
  -H "Content-Type: application/json" \
  -d '{"date": "2025-10-10T00:00:00.000Z"}'
```

### **Discord Notification Format**
```
📢 Tomorrow's Kitchen Team (Wednesday, Oct 5):
- Anita (Team Lead)
- Mohan (paneer)
- Devendra (egg)

⏰ Please be ready by 7:00 AM
📝 Team lead should coordinate with all members
🍳 Follow the kitchen duty guidelines

Good luck with your kitchen duty! 🎉
```

## 📊 System Status Monitoring

### **Check Cutoff Status**
```bash
curl http://localhost:3000/api/leave-management
```
Response:
```json
{
  "success": true,
  "cutoffStatus": {
    "isBeforeCutoff": true,
    "cutoffTime": "9:00:00 PM",
    "currentTime": "2:30:00 PM",
    "timeUntilCutoff": "6h 30m"
  }
}
```

### **View Assignment History**
```bash
curl http://localhost:3000/api/kitchen-history?days=30
```

## 🎨 Frontend Features

### **Dashboard Tabs**
- **Dashboard**: Overview with statistics
- **Duties**: Today's and tomorrow's assignments
- **Students**: Student roster with filtering
- **Settings**: Assignment controls and system info
- **Profile**: User management

### **Admin Controls**
- Manual assignment trigger
- Daily notification sender
- Leave management status
- History editing interface
- System configuration

## 🔄 Round-Robin Algorithm

### **Fair Rotation Logic**
1. Maintain queue of eligible students
2. Assign next student in rotation
3. Track cycle progress (7-day cycles)
4. Reset after full rotation complete
5. Account for leaves and exclusions

### **Sunday Special Handling**
1. Check if assignment date is Sunday
2. Ensure at least 1 egg preference student
3. Ensure at least 1 paneer preference student
4. Swap members if requirements not met
5. Maintain fairness in rotation

## 📝 Logging and Monitoring

### **Daily Assignment Logs**
```bash
# View daily assignment logs
tail -f /home/z/my-project/logs/daily-assignment.log
```

### **System Health Check**
```bash
curl http://localhost:3000/api/health
```

## 🚨 Error Handling

### **Common Issues**
1. **Discord Webhook Failed**: Check webhook URL and permissions
2. **Assignment Failed**: Verify eligible students available
3. **Leave After Cutoff**: System correctly rejects late requests
4. **Database Errors**: Check database connection and schema

### **Troubleshooting**
```bash
# Check database connection
curl http://localhost:3000/api/health

# Test Discord webhook
curl -X POST http://localhost:3000/api/discord-notify -d '{}'

# Verify assignment algorithm
curl -X POST http://localhost:3000/api/auto-assign \
  -H "Content-Type: application/json" \
  -d '{"date": "2025-10-15T00:00:00.000Z"}'
```

## 📈 System Metrics

### **Key Performance Indicators**
- Assignment success rate: Target >99%
- Notification delivery rate: Target >95%
- Leave processing time: <5 seconds
- System uptime: Target >99.9%
- Fair rotation compliance: 100%

### **Reporting**
- Weekly assignment summaries
- Leave request analytics
- Student participation metrics
- System performance reports

## 🔒 Security Considerations

- Admin authentication for history editing
- Rate limiting on API endpoints
- Input validation and sanitization
- Audit trail for all changes
- Secure Discord webhook handling

## 🎯 Future Enhancements

- Mobile app for students
- Advanced scheduling preferences
- Integration with calendar systems
- Automated reminder system
- Performance analytics dashboard
- Multi-location support

---

**System Status**: ✅ Fully Operational  
**Last Updated**: October 1, 2025  
**Version**: 2.0.0