# NavGurukul Kitchen & Student Management System

A comprehensive web-based system to manage daily kitchen duties, student profiles, food preferences, dashboards, and Discord notifications at NavGurukul.

## 🎯 Features

### Core System Features
- **Automated Kitchen Duty Assignment**: Fair rotation system with consecutive day prevention
- **Student Management**: Complete profile management with roles and preferences
- **Duty Swap System**: Peer-to-peer duty swapping with approval workflow
- **Leave Management**: Automated leave handling with 7-day buffer rule
- **Menu Management**: FC/Team Members can edit daily menus
- **Discord Integration**: Automated notifications for duties and swaps
- **Analytics Dashboard**: Comprehensive statistics and fairness reports

### User Roles & Permissions

#### Normal Student
- Participates in kitchen duty rotation
- Can mark leave with reason
- Can request duty swaps with other students
- Can select/change food preference (Paneer or Egg)
- View personal profile, kitchen history, and dashboard

#### Food Coordinator (FC)
- Exempt from kitchen duty during their term
- 3-month term with tracked start/end dates
- Can edit daily food menu
- Can assign Team Leader for each day's kitchen team
- Full access to all system data and dashboards

#### Team Member
- Exempt from kitchen duty during their term
- Can manage/edit system dashboards and data sheets
- Can remove student data when they leave or get placed

## 🏗️ Technology Stack

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes with Prisma ORM
- **Database**: SQLite with Prisma Client
- **Notifications**: Discord Webhooks via z-ai-web-dev-sdk
- **UI Components**: Complete shadcn/ui component set with Lucide icons

## 📊 Database Schema

### Core Models
- **Student**: Student profiles with roles, preferences, and status
- **KitchenDuty**: Daily duty assignments with menu
- **DutySwap**: Swap requests and approvals
- **LeaveRecord**: Leave requests and approvals
- **MenuOverride**: Special menu overrides for events

### Key Relationships
- Students can be Team Leaders or members in KitchenDuty
- Students can request or be targeted in DutySwap
- Students have multiple LeaveRecord entries

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Configure your database URL and Discord webhook URL.

4. Set up the database:
   ```bash
   npm run db:push
   ```

5. Seed the database with sample data:
   ```bash
   npx tsx seed.ts
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📡 API Endpoints

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Students
- `GET /api/students` - Get all students
- `POST /api/students` - Create new student
- `GET /api/students/[id]` - Get specific student
- `PUT /api/students/[id]` - Update student
- `DELETE /api/students/[id]` - Deactivate student

### Kitchen Duties
- `GET /api/kitchen-duty` - Get today's duty
- `POST /api/kitchen-duty` - Create new duty assignment
- `GET /api/auto-assign` - Auto-assign next 7 days
- `POST /api/auto-assign` - Assign duty for specific date

### Swaps
- `GET /api/swaps` - Get all swap requests
- `POST /api/swaps` - Create new swap request
- `PUT /api/swaps/[id]` - Approve/reject swap request

### Leaves
- `GET /api/leaves` - Get all leave records
- `POST /api/leaves` - Create leave request
- `PUT /api/leaves` - Update leave status

### Menu
- `GET /api/menu` - Get current menu and overrides
- `POST /api/menu` - Create menu override
- `PUT /api/menu` - Update existing menu

### Discord
- `GET /api/discord/notify` - Send daily notification
- `POST /api/discord/notify` - Send specific notification

## 🔄 Automated Processes

### Kitchen Duty Assignment Algorithm
1. Get all active students eligible for kitchen duty
2. Exclude students on leave or in exempt roles
3. Filter out students who did duty yesterday
4. Sort by: last duty date (asc), total duties (asc), join date (asc)
5. Select top 4 students (1 Team Leader + 3 members)
6. Update student duty counts and last duty date

### Leave Management
- Students on leave are automatically removed from future duties
- 7-day buffer rule: Students returning from leave get first duty after 7 days
- Leave status automatically updates student availability

### Discord Notifications
- Daily notifications with upcoming kitchen duty and menu
- Automatic student tagging using Discord IDs
- Swap request notifications with approval status

## 📈 Dashboard Analytics

### Statistics Tracked
- Total students and status distribution
- Food preference breakdown (Egg vs Paneer)
- Work type distribution (Kitchen vs Team)
- Monthly duty counts
- Fairness reports (most/least duties)

### Visualizations
- Progress bars for preference distributions
- Status overview charts
- Recent activity feeds
- Interactive duty calendars

## 🛡️ Fairness Rules

### Duty Assignment
- No consecutive day assignments
- Equal distribution based on total duties
- Priority to students who haven't done duty recently
- New students get priority after initial training period

### Swap System
- Both parties must approve for swap to be valid
- Cannot swap with students on leave
- Automatic duty reassignment on approved swaps
- Complete audit trail of all swaps

## 🔧 Configuration

### Environment Variables
```env
DATABASE_URL="file:./dev.db"
DISCORD_WEBHOOK_URL="your_discord_webhook_url"
NEXTAUTH_SECRET="your_nextauth_secret"
```

### Menu Defaults
- Breakfast: Poha with Sev
- Lunch: Dal Makhani + Rice + Roti
- Snacks: Samosa + Chai
- Dinner: Mixed Veg + Parantha

## 📝 Development Notes

### Code Structure
- `/src/app` - Next.js app router pages and API routes
- `/src/lib` - Database client and utilities
- `/src/components` - Reusable UI components
- `/prisma` - Database schema and migrations

### Best Practices
- TypeScript throughout with strict typing
- API-first design with comprehensive error handling
- Responsive design with mobile-first approach
- Accessibility with semantic HTML and ARIA support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation

---

Built with ❤️ for NavGurukul community