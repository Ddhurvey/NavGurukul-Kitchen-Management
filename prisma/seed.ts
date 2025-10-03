import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create sample users
  const users = [
    {
      name: 'Vishwanath Nagwat',
      email: 'vishwanath@navgurukul.org',
      password: 'password123',
      role: 'STUDENT',
      foodPreference: 'PANEER',
      totalKitchenTurns: 12,
      leaveDays: 3
    },
    {
      name: 'Govind',
      email: 'govind@navgurukul.org',
      password: 'password123',
      role: 'STUDENT',
      foodPreference: 'EGGS',
      totalKitchenTurns: 8,
      leaveDays: 2
    },
    {
      name: 'Bhavesh',
      email: 'bhavesh@navgurukul.org',
      password: 'password123',
      role: 'STUDENT',
      foodPreference: 'PANEER',
      totalKitchenTurns: 15,
      leaveDays: 1
    },
    {
      name: 'Md Arhan Alam',
      email: 'arhan@navgurukul.org',
      password: 'password123',
      role: 'STUDENT',
      foodPreference: 'EGGS',
      totalKitchenTurns: 10,
      leaveDays: 4
    },
    {
      name: 'Alice Johnson',
      email: 'alice@navgurukul.org',
      password: 'password123',
      role: 'FC',
      foodPreference: 'PANEER',
      totalKitchenTurns: 0,
      leaveDays: 0
    },
    {
      name: 'Bob Smith',
      email: 'bob@navgurukul.org',
      password: 'password123',
      role: 'TEAM_MEMBER',
      foodPreference: 'EGGS',
      totalKitchenTurns: 0,
      leaveDays: 0
    },
    {
      name: 'Charlie Davis',
      email: 'charlie@navgurukul.org',
      password: 'password123',
      role: 'STUDENT',
      foodPreference: 'PANEER',
      totalKitchenTurns: 6,
      leaveDays: 2
    },
    {
      name: 'Diana Prince',
      email: 'diana@navgurukul.org',
      password: 'password123',
      role: 'STUDENT',
      foodPreference: 'EGGS',
      totalKitchenTurns: 9,
      leaveDays: 1
    }
  ]

  for (const userData of users) {
    const hashedPassword = await bcrypt.hash(userData.password, 10)
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        password: hashedPassword,
        rotationPosition: users.indexOf(userData), // Set initial rotation position
        lastTurnDate: userData.totalKitchenTurns > 0 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null
      }
    })
  }

  // Get the created users
  const createdUsers = await prisma.user.findMany({
    where: {
      email: {
        in: users.map(u => u.email)
      }
    }
  })

  // Create today's kitchen turn
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const kitchenTurn = await prisma.kitchenTurn.upsert({
    where: { date: today },
    update: {},
    create: {
      date: today,
      status: 'PENDING',
      teamLeaderId: createdUsers[0].id // Vishwanath as TL
    }
  })

  // Assign students to today's kitchen turn
  const studentIds = createdUsers.slice(0, 4).map(u => u.id) // First 4 students
  for (const studentId of studentIds) {
    await prisma.kitchenTurnStudent.upsert({
      where: {
        kitchenTurnId_studentId: {
          kitchenTurnId: kitchenTurn.id,
          studentId
        }
      },
      update: {},
      create: {
        kitchenTurnId: kitchenTurn.id,
        studentId
      }
    })
  }

  // Create today's food menu
  await prisma.foodMenu.upsert({
    where: { date: today },
    update: {},
    create: {
      date: today,
      breakfast: 'Poha',
      lunch: 'Dal + Rice',
      snacks: 'Samosa',
      dinner: 'Veg + Roti',
      updatedBy: createdUsers[4].id // Alice (FC) updated it
    }
  })

  // Create some sample leaves
  const sampleLeaves = [
    {
      studentId: createdUsers[5].id, // Bob
      reason: 'Family emergency',
      startDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
      endDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // 2 days
      approvedBy: createdUsers[4].id, // Alice (FC)
      status: 'APPROVED'
    },
    {
      studentId: createdUsers[6].id, // Charlie
      reason: 'Medical appointment',
      startDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000), // In 5 days
      endDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000), // Same day
      status: 'PENDING'
    }
  ]

  for (const leaveData of sampleLeaves) {
    await prisma.leave.create({
      data: leaveData
    })
  }

  // Create role history for FC and Team Member
  await prisma.userRoleHistory.createMany({
    data: [
      {
        studentId: createdUsers[4].id, // Alice
        role: 'FC',
        startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000) // 60 days from now
      },
      {
        studentId: createdUsers[5].id, // Bob
        role: 'TEAM_MEMBER',
        startDate: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        endDate: new Date(today.getTime() + 75 * 24 * 60 * 60 * 1000) // 75 days from now
      }
    ]
  })

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })