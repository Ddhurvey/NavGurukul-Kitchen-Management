import { PrismaClient } from '@prisma/client'
import { db } from '../src/lib/db'

async function main() {
  console.log('Seeding database...')

  // Create sample students
  const students = await Promise.all([
    db.student.create({
      data: {
        name: 'Vishwanath Nagwat',
        email: 'vishwanath@navgurukul.org',
        foodPreference: 'egg',
        isActive: true,
        isPresent: true,
        isTeamMember: false,
        isJobPlaced: false,
        profileClosed: false
      }
    }),
    db.student.create({
      data: {
        name: 'Govind',
        email: 'govind@navgurukul.org',
        foodPreference: 'paneer',
        isActive: true,
        isPresent: true,
        isTeamMember: false,
        isJobPlaced: false,
        profileClosed: false
      }
    }),
    db.student.create({
      data: {
        name: 'Bhavesh',
        email: 'bhavesh@navgurukul.org',
        foodPreference: 'egg',
        isActive: true,
        isPresent: true,
        isTeamMember: false,
        isJobPlaced: false,
        profileClosed: false
      }
    }),
    db.student.create({
      data: {
        name: 'Md Arhan Alam',
        email: 'arhan@navgurukul.org',
        foodPreference: 'paneer',
        isActive: true,
        isPresent: true,
        isTeamMember: false,
        isJobPlaced: false,
        profileClosed: false
      }
    }),
    db.student.create({
      data: {
        name: 'Dharamshala Student',
        email: 'dharamshala@navgurukul.org',
        foodPreference: 'egg',
        isActive: true,
        isPresent: true,
        isTeamMember: false,
        isJobPlaced: false,
        profileClosed: false
      }
    }),
    db.student.create({
      data: {
        name: 'Team Member 1',
        email: 'team1@navgurukul.org',
        foodPreference: 'egg',
        isActive: true,
        isPresent: true,
        isTeamMember: true,
        isJobPlaced: false,
        profileClosed: false
      }
    }),
    db.student.create({
      data: {
        name: 'Student on Leave',
        email: 'leave@navgurukul.org',
        foodPreference: 'paneer',
        isActive: true,
        isPresent: false,
        isTeamMember: false,
        isJobPlaced: false,
        profileClosed: false
      }
    }),
    db.student.create({
      data: {
        name: 'Job Placed Student',
        email: 'placed@navgurukul.org',
        foodPreference: 'egg',
        isActive: true,
        isPresent: true,
        isTeamMember: false,
        isJobPlaced: true,
        profileClosed: true
      }
    })
  ])

  console.log('Created students:', students.map(s => s.name))

  // Create a Food Coordinator
  const fc = await db.foodCoordinator.create({
    data: {
      studentId: students[0].id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      isActive: true
    }
  })

  console.log('Created Food Coordinator:', students[0].name)

  // Create today's food menu
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const menu = await db.foodMenu.create({
    data: {
      date: today,
      breakfast: 'Poha',
      lunch: 'Dal+Rice',
      snacks: '(none)',
      dinner: 'veg+roti',
      fcId: fc.id
    }
  })

  console.log('Created today\'s menu')

  // Create tomorrow's kitchen duty
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const kitchenDuty = await db.kitchenDuty.create({
    data: {
      date: tomorrow,
      teamLeadId: students[1].id,
      assignments: {
        create: [
          {
            studentId: students[1].id,
            isTeamLead: true
          },
          {
            studentId: students[2].id,
            isTeamLead: false
          },
          {
            studentId: students[3].id,
            isTeamLead: false
          },
          {
            studentId: students[4].id,
            isTeamLead: false
          }
        ]
      }
    },
    include: {
      assignments: {
        include: {
          student: true
        }
      }
    }
  })

  console.log('Created tomorrow\'s kitchen duty with team lead:', students[1].name)

  // Create tomorrow's food menu
  const tomorrowMenu = await db.foodMenu.create({
    data: {
      date: tomorrow,
      breakfast: 'Upma',
      lunch: 'Chole+Rice',
      snacks: 'Samosa',
      dinner: 'Paneer+Roti',
      fcId: fc.id
    }
  })

  console.log('Created tomorrow\'s menu')

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })