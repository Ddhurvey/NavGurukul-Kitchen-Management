# NavGurukul Kitchen Duty Management System

A comprehensive automated system for managing kitchen duties for students at NavGurukul. This system handles daily kitchen turn assignments, student profiles, food preferences, leave management, and automated notifications.

## Features

### 🍳 Core System Requirements

- **Daily Kitchen Turn Assignment**: Automatically assigns 4 different students every day
- **Turn-by-turn System**: Ensures same students aren't assigned on consecutive days
- **Active Student Filtering**: Only includes currently active and present students
- **Leave Management**: Handles student leaves and automatically skips their kitchen turns

### 👥 Student Profile Management

- **Complete Profiles**: Track name, email, food preference (egg/paneer)
- **Duty History**: Record of all kitchen turns completed
- **Leave Tracking**: Record of all leave days with reasons
- **Job Placement**: Mark profiles as "closed" when students get jobs
- **Team Member Exemptions**: Core team members are exempt from kitchen duties

### 🏆 User Roles and Permissions

#### Food Coordinator (FC)
- **3-month Term**: Automatically tracks FC duration
- **Duty Exemption**: FC is exempt from all kitchen duties
- **Menu Management**: Authority to edit daily food menu
- **Team Lead Assignment**: Can assign TL for each day's kitchen team

#### Team Members
- **Duty Exemption**: Core team members are exempt from kitchen duties
- **Data Management**: Authority to remove student data from system

#### All Students
- **Swap Requests**: Can request to swap kitchen turns with other students
- **Reason Tracking**: System records swap reasons (health issues, personal matters)
- **Mutual Approval**: Both students must agree for swap approval

### 🔔 Automated Notifications

- **Daily Discord Messages**: Automatically sends next day's assignments and menu
- **Formatted Messages**: Follows specific format with @mentions and menu details
- **FC Signature**: Messages are signed by current Food Coordinator

### 📊 Menu and Data Management

- **Complete Menu Tracking**: Breakfast, lunch, snacks, and dinner options
- **Food Preferences**: Tracks egg vs paneer preferences for Sunday meals
- **Dashboard Analytics**: Total student count and relevant statistics
- **History Tracking**: Complete history of all kitchen duty assignments

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5
- **Database**: SQLite with Prisma ORM
- **Styling**: Tailwind CSS 4 with shadcn/ui components
- **UI Components**: Complete shadcn/ui component set with Lucide icons
- **State Management**: Zustand for client state, TanStack Query for server state

## Installation and Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   ```bash
   npm run db:push
   npm run db:seed
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Database Schema

The system uses the following main entities:

- **Student**: Student profiles with preferences and status
- **KitchenDuty**: Daily kitchen duty assignments
- **DutyAssignment**: Individual student assignments to duties
- **FoodCoordinator**: FC role assignments and terms
- **FoodMenu**: Daily food menus managed by FC
- **Leave**: Student leave requests and approvals
- **SwapRequest**: Kitchen duty swap requests between students

## API Endpoints

### Students
- `GET /api/students` - Get all eligible students
- `POST /api/students` - Create new student

### Kitchen Duties
- `GET /api/kitchen-duty` - Get today's and tomorrow's duties
- `POST /api/kitchen-duty` - Create new kitchen duty assignment
- `POST /api/auto-assign` - Auto-assign kitchen duty for a date

### Food Menu
- `GET /api/food-menu` - Get today's food menu
- `POST /api/food-menu` - Create new food menu
- `PUT /api/food-menu` - Update existing food menu

### Food Coordinator
- `GET /api/food-coordinator` - Get current and all FC assignments
- `POST /api/food-coordinator` - Assign new Food Coordinator

### Leave Management
- `GET /api/leaves` - Get all leave requests
- `POST /api/leaves` - Create new leave request
- `PUT /api/leaves` - Update leave status

### Swap Requests
- `GET /api/swap-requests` - Get all swap requests
- `POST /api/swap-requests` - Create new swap request
- `PUT /api/swap-requests` - Update swap request status

### Discord Notifications
- `POST /api/discord-notify` - Send Discord notification for tomorrow's duty

## Key Features Implementation

### Automatic Kitchen Duty Assignment

The system automatically assigns kitchen duties using the following algorithm:

1. **Eligibility Check**: Filters students who are active, present, not team members, and not job placed
2. **Consecutive Day Prevention**: Excludes students who were on duty yesterday
3. **Team Lead Selection**: Automatically assigns first student as Team Lead
4. **Fallback Logic**: If not enough students after filtering, uses all eligible students

### Leave Management System

- **Automatic Status Updates**: When leave is approved, student presence status is updated
- **Return Handling**: Students returning from leave have their next turn scheduled one week after return
- **Reason Tracking**: All leaves include detailed reasons for record-keeping

### Discord Integration

The system formats Discord messages exactly as specified:

```
Food menu for Tomorrow

@Vishwanath Nagwat- (T.L)
@Govind
@Bhavesh
@Md Arhan Alam

Breakfast:- Poha
Lunch:- Dal+Rice
Snacks:- (none)
Dinner:- veg+roti

@Dharamshala Student (current)
Regards (F.C)
```

## Dashboard Features

The main dashboard provides:

- **Real-time Statistics**: Total students, on leave, team members, job placed
- **Today's Duty**: Current kitchen team with food preferences
- **Tomorrow's Duty**: Upcoming assignments
- **Food Menu**: Today's complete menu display
- **Quick Actions**: Auto-assign duties, send notifications, refresh data

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:push` - Push database schema
- `npm run db:seed` - Seed database with sample data

### Database Management

- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:reset` - Reset database

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is part of NavGurukul's educational management system.