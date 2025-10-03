# 🔧 NavGurukul Kitchen Management System - Reset & Implementation Guide

## 📋 Overview

This guide explains how to reset and implement the NavGurukul kitchen management system, handling various edge cases and ensuring proper initialization.

## 🚀 Quick Start

### 1. Environment Setup

Set up your admin reset key in `.env.local`:
```bash
ADMIN_RESET_KEY=your-secure-admin-key-here
```

### 2. Database Reset

#### Full System Reset
```bash
curl -X POST http://localhost:3000/api/admin/reset \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "your-secure-admin-key-here"}'
```

#### Quick Reset (Today's Data Only)
```bash
curl -X POST http://localhost:3000/api/admin/system-status \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "your-secure-admin-key-here", "action": "quick_reset"}'
```

#### Notification Reset
```bash
curl -X POST http://localhost:3000/api/admin/notifications/reset \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "your-secure-admin-key-here"}'
```

## 🔄 Initialization Logic

### First User Detection

When the first active student logs in:

1. **System detects first user** → Creates initial rotation cycle
2. **Assigns first duty** → Today's kitchen duty assigned to first user
3. **Sets up notifications** → Schedules 9 PM daily and Sunday 9 AM notifications
4. **Creates default menu** → Poha, Dal + Rice, Samosa, Veg + Roti

```javascript
// API Endpoint: POST /api/auth/init-rotation
{
  "userId": "user-id-here"
}
```

### Multiple Same-Day Registrations

When multiple students register on the same day:

1. **Maintains registration order** → Uses exact creation timestamp
2. **Assigns sequential positions** → Earlier registration gets earlier rotation
3. **Logs the handling** → Creates audit trail for same-day assignments

```javascript
// API Endpoint: POST /api/auth/handle-multiple-registrations
{
  "userId": "user-id-here"
}
```

## 📊 System Status Monitoring

### Check System Health
```bash
curl http://localhost:3000/api/admin/system-status
```

Returns:
- System overview (users, rotation status, readiness)
- Kitchen status (today's assignment, completion stats)
- Food menu status
- Notification status
- Rotation cycle details
- Health checks

### Check Rotation Status
```bash
curl "http://localhost:3000/api/auth/init-rotation?userId=user-id-here"
```

## 🎯 Edge Cases Handled

### 1. Empty Database State
- ✅ First user automatically initializes rotation
- ✅ Default menu created for today
- ✅ Notifications scheduled for future

### 2. Multiple Same-Day Registrations
- ✅ Maintains exact registration order
- ✅ Sequential rotation positions
- ✅ Audit logging for transparency

### 3. System Recovery
- ✅ Detects existing rotation cycles
- ✅ Recovers missing user assignments
- ✅ Maintains data integrity

### 4. Notification Failures
- ✅ Automatic rescheduling on reset
- ✅ Separate notification reset available
- ✅ Immediate notifications for tomorrow's duty

## 🖥️ UI Empty States

### Dashboard Empty States
- **No kitchen team**: Shows informative message with chef icon
- **No food menu**: Shows default menu explanation
- **No active users**: System waits for first registration

### Profile Empty States
- **No kitchen duties**: Explains rotation system
- **No leave history**: Guides to leave request
- **No statistics**: Shows placeholder with loading state

## 📅 Notification Schedule

### Daily Notifications
- **9 PM India Time**: Tomorrow's kitchen team announcement
- **Skips Sunday**: Handled by Saturday 9 AM special

### Sunday Special Notifications
- **Saturday 9 AM India Time**: Sunday team announcement
- **Egg/Paneer indicators**: Shows dietary preferences
- **Early notification**: Gives students more preparation time

### Immediate Notifications
- **Triggered**: When first duty is assigned
- **Sent**: Right after system initialization

## 🔍 Troubleshooting

### Common Issues

#### 1. "No active rotation cycle"
```bash
# Check system status
curl http://localhost:3000/api/admin/system-status

# Initialize with first user
curl -X POST http://localhost:3000/api/auth/init-rotation \
  -H "Content-Type: application/json" \
  -d '{"userId": "first-user-id"}'
```

#### 2. "Notifications not scheduled"
```bash
# Reset notification system
curl -X POST http://localhost:3000/api/admin/notifications/reset \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "your-admin-key"}'
```

#### 3. "Multiple users same position"
```bash
# Handle same-day registrations
curl -X POST http://localhost:3000/api/auth/handle-multiple-registrations \
  -H "Content-Type: application/json" \
  -d '{"userId": "affected-user-id"}'
```

### Health Checks

The system provides these health indicators:
- ✅ **Database**: Connection and query status
- ✅ **Rotation System**: Initialization status
- ✅ **Today Assignments**: Readiness for current day
- ✅ **Notifications**: Scheduling status

## 📝 Audit Trail

All major actions are logged in `HistoryLog` table:
- `SYSTEM_RESET`: Full system reset
- `ROTATION_INITIALIZED`: First user setup
- `SAME_DAY_REGISTRATION_HANDLED`: Multiple same-day signups
- `NOTIFICATION_SYSTEM_RESET`: Notification rescheduling
- `KITCHEN_TURN_UPDATED`: Duty assignments
- `FOOD_MENU_UPDATED`: Menu changes

## 🛡️ Security Considerations

### Admin Key Protection
- Use strong, unique admin reset key
- Store in environment variables only
- Rotate keys periodically

### API Authorization
- All reset endpoints require admin key
- User-specific endpoints validate user existence
- Role-based access control enforced

## 📈 Performance Considerations

### Database Operations
- Batch operations for multiple updates
- Efficient queries with proper indexing
- Transaction-based consistency

### Notification Scheduling
- Batch creation of future notifications
- Efficient querying for pending notifications
- Automatic cleanup of old notifications

## 🔄 Automated Recovery

The system automatically handles:
1. **Missing rotation cycles** → Creates new cycle
2. **Unassigned users** → Adds to existing cycle
3. **Missing notifications** → Reschedules automatically
4. **Empty today's data** → Creates default assignments

## 📞 Support

For issues with the reset and implementation:
1. Check system status endpoint first
2. Review audit logs in HistoryLog table
3. Use specific reset endpoints for targeted fixes
4. Full reset as last resort

---

## 🎯 Best Practices

1. **Test in development** before production reset
2. **Backup data** before full system reset
3. **Monitor logs** during initialization
4. **Verify notifications** after reset
5. **Check user positions** after same-day registrations

This system ensures robust handling of all edge cases while maintaining data integrity and providing clear feedback to administrators and users.