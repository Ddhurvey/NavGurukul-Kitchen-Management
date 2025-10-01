# 🔐 Authentication System Guide

## Overview
The NavGurukul Kitchen Management System now includes a comprehensive authentication system with role-based access control, allowing multiple students to register, login, and access appropriate features based on their roles.

## 🎯 Features Added

### 1. User Registration & Login
- **Registration Form**: New students can sign up with:
  - Full name
  - Email address
  - Password
  - Discord ID (optional)
  - Food preference (Paneer/Egg)
- **Login Form**: Existing students can login with email and password
- **Session Management**: Secure token-based authentication with 7-day expiry

### 2. Role-Based Access Control
- **Students**: Can view dashboard, request swaps, manage leave
- **Food Coordinators (FC)**: Can edit menus, assign team leaders, auto-assign duties
- **Team Members**: Can manage dashboards, edit system data, remove students

### 3. User Profile System
- **Profile Display**: Shows user information, role, work type, status
- **Quick Logout**: One-click logout functionality
- **Role Badges**: Visual indicators for user roles and permissions

## 🚀 Getting Started

### Test Accounts
Use these pre-configured accounts to test the system:

| Email | Password | Role | Work Type |
|-------|----------|------|-----------|
| priya@navgurukul.org | password123 | Student | Kitchen |
| rahul@navgurukul.org | password123 | Student | Kitchen |
| anjali@navgurukul.org | password123 | Student | Kitchen (On Leave) |
| amit@navgurukul.org | password123 | Student | Kitchen |
| neha@navgurukul.org | password123 | Team Member | Team |
| vikram@navgurukul.org | password123 | Student | Kitchen (Placed) |

### Registration Flow
1. Visit the application homepage
2. Click "Register" tab
3. Fill in your details:
   - Full name
   - Email (must be unique)
   - Password (minimum 6 characters)
   - Confirm password
   - Discord ID (optional, for notifications)
   - Food preference
4. Click "Create Account"
5. You'll be automatically logged in and redirected to the dashboard

### Login Flow
1. Visit the application homepage
2. Enter your email and password
3. Click "Login"
4. You'll be redirected to your personalized dashboard

## 🏗️ Technical Implementation

### Database Schema Updates
```sql
-- Added to Student model
password        String    -- Hashed password
lastLoginAt     DateTime? -- Last login timestamp
isActive        Boolean   -- Account status

-- New Session model
StudentSession {
  id        String   @id @default(cuid())
  studentId String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

### Authentication Flow
1. **Registration**: Password is hashed using bcrypt and stored in database
2. **Login**: Credentials are verified, JWT token is generated
3. **Session**: Token stored in database with expiry date
4. **Authorization**: Each API request validates token and user role
5. **Logout**: Token is removed from database

### Role-Based UI Components
```tsx
// Only show to FC and Team Members
<RoleGuard allowedRoles={['FC', 'TEAM_MEMBER']}>
  <Button>Auto-Assign Duties</Button>
</RoleGuard>

// Only show to authenticated users
<PermissionGuard requiresAuth={true}>
  <Dashboard />
</PermissionGuard>
```

## 🔒 Security Features

### Password Security
- All passwords are hashed using bcrypt with salt rounds
- Passwords are never stored in plain text
- Minimum password length enforced

### Session Management
- JWT tokens with 7-day expiry
- Secure token storage in database
- Automatic session cleanup on logout
- Token validation on every API request

### Role-Based Access
- Server-side role validation for all sensitive operations
- UI components conditionally rendered based on user role
- API endpoints protected by role checks

## 📱 User Experience

### Responsive Design
- Mobile-friendly authentication forms
- Adaptive layout for different screen sizes
- Touch-friendly buttons and inputs

### Error Handling
- Clear error messages for registration/login failures
- Form validation with helpful feedback
- Graceful handling of network errors

### Loading States
- Loading indicators during authentication
- Smooth transitions between states
- Progressive loading of dashboard data

## 🎨 UI Components

### Authentication Page
- Clean, modern design with NavGurukul branding
- Tab-based interface for login/register
- Form validation with real-time feedback
- Optional fields clearly marked

### User Profile Card
- Avatar with user initials
- Role and status badges
- Quick logout button
- Discord ID display (if provided)

### Role-Based Elements
- Conditional button visibility
- Permission-gated features
- Visual role indicators
- Contextual help text

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info

### Protected Routes
All existing API endpoints now require authentication:
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/kitchen-duty` - Today's duty
- `GET /api/swaps` - Swap requests
- `POST /api/auto-assign` - Auto-assign duties (FC/Team only)

## 🚀 Future Enhancements

### Planned Features
- **Password Reset**: Email-based password recovery
- **Profile Editing**: Allow users to update their information
- **Role Management**: Admin interface for role changes
- **Two-Factor Authentication**: Enhanced security
- **Social Login**: Google/Discord OAuth integration

### Scalability
- Redis for session storage
- Database connection pooling
- Rate limiting for auth endpoints
- Audit logging for security events

## 🛠️ Development Notes

### Environment Variables
```env
JWT_SECRET=your-super-secret-jwt-key
DATABASE_URL=file:./dev.db
```

### Testing
```bash
# Test registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Debugging
- Check browser console for authentication errors
- Verify token in localStorage
- Monitor network requests in dev tools
- Check server logs for detailed error messages

---

## 🎉 Summary

The authentication system is now fully integrated with role-based access control, allowing:
- Multiple students to register and join the system
- Secure login/logout functionality
- Role-based feature access
- Personalized user experiences
- Enhanced security and data protection

The system maintains all existing functionality while adding a robust authentication layer that scales with the NavGurukul community's needs.