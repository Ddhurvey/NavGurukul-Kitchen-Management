# NavGurukul Kitchen Management System - Authentication Guide

## 🔐 Authentication System Overview

The NavGurukul Kitchen Management System now includes a complete authentication system with user registration, login, logout, and protected routes.

## 🚀 Features Implemented

### ✅ Authentication Features
- **User Registration** - Complete signup with validation
- **User Login** - Secure authentication with JWT tokens
- **User Logout** - Secure session termination
- **Protected Routes** - Authentication required for main app
- **Role-based Access** - Admin-only settings section
- **Demo User Setup** - Quick demo account creation

### ✅ Security Features
- **Password Hashing** - bcryptjs for secure password storage
- **JWT Tokens** - Secure session management
- **HTTP-only Cookies** - Protected token storage
- **Input Validation** - Zod schema validation
- **Role-based Authorization** - Admin access control

## 📁 File Structure

```
src/
├── app/
│   ├── api/auth/
│   │   ├── login/route.ts          # Login API endpoint
│   │   ├── logout/route.ts         # Logout API endpoint
│   │   ├── register/route.ts       # Registration API endpoint
│   │   ├── me/route.ts             # User session check API
│   │   └── create-demo/route.ts    # Demo user creation API
│   ├── login/page.tsx              # Login page
│   ├── signup/page.tsx             # Signup page
│   ├── setup-demo/page.tsx         # Demo setup page
│   └── page.tsx                    # Protected main page
├── contexts/
│   └── AuthContext.tsx             # Authentication context
└── lib/
    └── db.ts                       # Database connection
```

## 🔑 API Endpoints

### POST /api/auth/register
Registers a new user and initializes the system if it's the first student.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "STUDENT",
  "foodPreference": "PANEER"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "STUDENT",
    "status": "ACTIVE",
    "foodPreference": "PANEER",
    "totalKitchenTurns": 0,
    "leaveDays": 0,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /api/auth/login
Authenticates a user and creates a session.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "STUDENT",
    "status": "ACTIVE",
    "foodPreference": "PANEER",
    "totalKitchenTurns": 1,
    "leaveDays": 0,
    "rotationPosition": 0,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /api/auth/logout
Logs out the current user and clears the session.

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### GET /api/auth/me
Returns the current authenticated user's information.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "STUDENT",
    "status": "ACTIVE",
    "foodPreference": "PANEER",
    "totalKitchenTurns": 1,
    "leaveDays": 0,
    "rotationPosition": 0,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /api/auth/create-demo
Creates a demo user for testing purposes.

**Response:**
```json
{
  "success": true,
  "message": "Demo user created successfully",
  "user": {
    "id": "demo_user_id",
    "name": "Demo Student",
    "email": "demo@navgurukul.org",
    "role": "STUDENT"
  }
}
```

## 🎯 User Roles

### STUDENT
- Can view dashboard
- Can view profile
- Can view kitchen assignments
- Can view food menu
- Cannot access settings

### ADMIN
- All STUDENT permissions
- Can access system settings
- Can view system health
- Can perform administrative actions

### FC / TEAM_MEMBER
- Same permissions as STUDENT
- Future features can be added for these roles

## 🔄 Authentication Flow

### 1. User Registration
1. User fills out registration form
2. Client validates input
3. POST request to `/api/auth/register`
4. Server validates and creates user
5. If first student, initializes rotation system
6. Returns user data
7. Auto-logs in the user

### 2. User Login
1. User enters credentials
2. Client validates input
3. POST request to `/api/auth/login`
4. Server validates credentials
5. Creates JWT token
6. Sets HTTP-only cookie
7. Returns user data
8. Redirects to dashboard

### 3. Protected Route Access
1. User tries to access protected page
2. AuthProvider checks authentication
3. If not authenticated, redirects to login
4. If authenticated, shows content

### 4. User Logout
1. User clicks logout
2. POST request to `/api/auth/logout`
3. Server clears session
4. Client clears user state
5. Redirects to login page

## 🛡️ Security Measures

### Password Security
- All passwords are hashed using bcryptjs
- Salt rounds: 12
- Passwords are never stored in plain text

### Session Security
- JWT tokens with 7-day expiration
- HTTP-only cookies prevent XSS attacks
- Secure cookies in production
- SameSite protection against CSRF

### Input Validation
- Zod schemas for all API inputs
- Email format validation
- Password length requirements
- Role and food preference validation

### Authorization
- Role-based access control
- Admin-only routes protection
- User data isolation

## 🎨 UI Components

### Login Page (`/login`)
- Email and password fields
- Show/hide password toggle
- Demo account information
- Link to signup page
- Error handling and loading states

### Signup Page (`/signup`)
- Full name, email, password fields
- Role selection dropdown
- Food preference selection
- Password confirmation
- Auto-login after registration

### Demo Setup Page (`/setup-demo`)
- One-click demo user creation
- Automatic system initialization
- Visual feedback and progress
- Redirect to login after creation

### Main Application (`/`)
- Protected route
- User profile in header
- Logout functionality
- Role-based navigation
- Authentication state management

## 🚀 Quick Start Guide

### 1. Setup Demo Account
1. Navigate to `/setup-demo`
2. Click "Create Demo User"
3. Wait for creation confirmation
4. Redirect to login page

### 2. Login with Demo Account
1. Go to `/login`
2. Use demo credentials:
   - Email: `demo@navgurukul.org`
   - Password: `demo123`
3. Click "Sign In"
4. Redirect to dashboard

### 3. Create New Account
1. Go to `/signup`
2. Fill in registration form
3. Select role and food preference
4. Click "Create Account"
5. Auto-login and redirect to dashboard

### 4. Access Admin Features
1. Create an admin user or update existing user role to "ADMIN"
2. Login with admin credentials
3. Access "Settings" in sidebar
4. View system health and administrative tools

## 🔧 Environment Variables

Required environment variables for authentication:

```env
# JWT Secret for token signing
JWT_SECRET=your-super-secret-jwt-key-here

# Admin reset key for system operations
ADMIN_RESET_KEY=your-admin-reset-key-here

# Database URL
DATABASE_URL=file:./dev.db
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Login Fails with "Invalid email or password"
- Check email and password spelling
- Ensure user is registered
- Check if user status is "ACTIVE"

#### 2. Registration Fails with "User with this email already exists"
- Try logging in with existing account
- Use different email address
- Contact admin to reset account

#### 3. Redirect Loop on Main Page
- Check browser cookies are enabled
- Clear browser cache and cookies
- Check JWT_SECRET is set

#### 4. Demo User Creation Fails
- Check database connection
- Ensure database schema is up to date
- Check server logs for errors

### Debug Mode

To enable debug logging, add to your environment:
```env
DEBUG=auth:*
```

## 📝 Development Notes

### Authentication Context
The `AuthContext` provides:
- Current user state
- Loading states
- Login/logout functions
- Registration function
- Authentication status

### Protected Routes
Routes are protected at the component level:
- Check authentication status
- Redirect to login if not authenticated
- Show loading state during auth check

### Database Integration
Authentication integrates with existing database:
- Uses existing User model
- Maintains data consistency
- Handles foreign key constraints

## 🎉 Summary

The authentication system is now fully integrated with the NavGurukul Kitchen Management System. It provides:

- ✅ Secure user authentication
- ✅ Role-based access control
- ✅ Demo user setup for testing
- ✅ Protected routes and API endpoints
- ✅ Beautiful and responsive UI
- ✅ Comprehensive error handling
- ✅ Integration with existing kitchen management features

The system is ready for production use and can handle multiple users with different roles while maintaining security and data integrity.