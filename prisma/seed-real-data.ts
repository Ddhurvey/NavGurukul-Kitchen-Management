import { PrismaClient } from '@prisma/client'
import { db } from '../src/lib/db'

async function main() {
  console.log('Seeding database with actual student data...')

  // Clear existing data
  console.log('Clearing existing data...')
  await db.swapRequest.deleteMany()
  await db.dutyAssignment.deleteMany()
  await db.kitchenDuty.deleteMany()
  await db.foodMenu.deleteMany()
  await db.leave.deleteMany()
  await db.foodCoordinator.deleteMany()
  await db.student.deleteMany()

  // Create actual students from the provided data
  const students = await Promise.all([
    db.student.create({
      data: {
        name: 'Abhishek pal',
        email: 'abhishekpal25@navgurukul.org',
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
        name: 'Akash',
        email: 'akash24@navgurukul.org',
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
        name: 'Anurag Arya',
        email: 'anuragarya25@navgurukul.org',
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
        name: 'Deep Tiwari',
        email: 'deeptiwaari2025@gmail.com',
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
        name: 'Devendra Dhurvey (꧁रA1꧂)',
        email: 'devendradhur85@gmail.com',
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
        name: 'Tushar',
        email: 'tushar24@navgurukul.org',
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
        name: 'Yogesh Kumar',
        email: 'yogesh25@navgurukul.org',
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
        name: 'lokesh dangwal',
        email: 'lokesh25@navgurukul.org',
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
        name: 'riyan ramteke',
        email: 'riyan25@navgurukul.org',
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
        name: 'roshankumar',
        email: 'roshankumar25@navgurukul.com',
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
        name: 'sumit',
        email: 'sumi25@navgurukul.org',
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
        name: 'sunil',
        email: 'sunilkumar25@navgurukul.org',
        foodPreference: 'paneer',
        isActive: true,
        isPresent: true,
        isTeamMember: false,
        isJobPlaced: false,
        profileClosed: false
      }
    })
  ])

  console.log(`Created ${students.length} students:`)
  students.forEach(student => {
    console.log(`- ${student.name} (${student.email}) - ${student.foodPreference}`)
  })

  // Create a Food Coordinator (using first student)
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

  // Create tomorrow's kitchen duty (first 4 students)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const kitchenDuty = await db.kitchenDuty.create({
    data: {
      date: tomorrow,
      teamLeadId: students[0].id,
      assignments: {
        create: [
          {
            studentId: students[0].id,
            isTeamLead: true
          },
          {
            studentId: students[1].id,
            isTeamLead: false
          },
          {
            studentId: students[2].id,
            isTeamLead: false
          },
          {
            studentId: students[3].id,
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

  console.log('Created tomorrow\'s kitchen duty:')
  console.log(`Team Lead: ${students[0].name}`)
  console.log('Team Members:')
  for (let i = 1; i <= 3; i++) {
    console.log(`- ${students[i].name} (${students[i].foodPreference})`)
  }

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

  // Create some sample leave requests
  const leaveRequest = await db.leave.create({
    data: {
      studentId: students[4].id,
      startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      reason: 'Going home for family function',
      status: 'pending'
    },
    include: {
      student: true
    }
  })

  console.log('Created sample leave request for:', leaveRequest.student.name)

  // Create a sample swap request
  const swapRequest = await db.swapRequest.create({
    data: {
      requesterId: students[5].id,
      approverId: students[6].id,
      originalDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
      swapDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      reason: 'Health issue - not feeling well'
    },
    include: {
      requester: true,
      approver: true
    }
  })

  console.log('Created sample swap request:')
  console.log(`${swapRequest.requester.name} wants to swap with ${swapRequest.approver.name}`)

  console.log('\n✅ Database seeded successfully with actual student data!')
  console.log('\n📊 Summary:')
  console.log(`- Total Students: ${students.length}`)
  console.log(`- Active for Duty: ${students.filter(s => s.isActive && s.isPresent).length}`)
  console.log(`- Food Preferences: ${students.filter(s => s.foodPreference === 'paneer').length} Paneer, ${students.filter(s => s.foodPreference === 'egg').length} Egg`)
  console.log(`- Food Coordinator: ${students[0].name}`)
  console.log(`- Tomorrow's Team Lead: ${students[0].name}`)
  console.log(`- Sample Leave Request: ${leaveRequest.student.name}`)
  console.log(`- Sample Swap Request: ${swapRequest.requester.name} ↔ ${swapRequest.approver.name}`)
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })