import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

async function seedDatabase() {
  try {
    // Create sample students with passwords
    const students = await Promise.all([
      db.student.create({
        data: {
          name: 'Priya Sharma',
          email: 'priya@navgurukul.org',
          password: await hashPassword('password123'),
          discordId: 'priya1234',
          foodPreference: 'PANEER',
          workType: 'KITCHEN',
          status: 'ACTIVE',
          totalDuties: 5,
          lastDutyDate: new Date('2024-01-10')
        }
      }),
      db.student.create({
        data: {
          name: 'Rahul Kumar',
          email: 'rahul@navgurukul.org',
          password: await hashPassword('password123'),
          discordId: 'rahul5678',
          foodPreference: 'EGG',
          workType: 'KITCHEN',
          status: 'ACTIVE',
          totalDuties: 3,
          lastDutyDate: new Date('2024-01-12')
        }
      }),
      db.student.create({
        data: {
          name: 'Anjali Patel',
          email: 'anjali@navgurukul.org',
          password: await hashPassword('password123'),
          discordId: 'anjali9012',
          foodPreference: 'PANEER',
          workType: 'KITCHEN',
          status: 'LEAVE',
          leaveStartAt: new Date('2024-01-15'),
          leaveEndAt: new Date('2024-01-20'),
          totalDuties: 4,
          lastDutyDate: new Date('2024-01-08')
        }
      }),
      db.student.create({
        data: {
          name: 'Amit Singh',
          email: 'amit@navgurukul.org',
          password: await hashPassword('password123'),
          discordId: 'amit3456',
          foodPreference: 'EGG',
          workType: 'KITCHEN',
          status: 'ACTIVE',
          totalDuties: 6,
          lastDutyDate: new Date('2024-01-14')
        }
      }),
      db.student.create({
        data: {
          name: 'Neha Gupta',
          email: 'neha@navgurukul.org',
          password: await hashPassword('password123'),
          discordId: 'neha7890',
          foodPreference: 'PANEER',
          workType: 'TEAM',
          status: 'ACTIVE',
          totalDuties: 0
        }
      }),
      db.student.create({
        data: {
          name: 'Vikram Singh',
          email: 'vikram@navgurukul.org',
          password: await hashPassword('password123'),
          discordId: 'vikram1357',
          foodPreference: 'EGG',
          workType: 'KITCHEN',
          status: 'PLACED',
          totalDuties: 8,
          lastDutyDate: new Date('2024-01-05')
        }
      })
    ])

    // Create today's kitchen duty
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    await db.kitchenDuty.create({
      data: {
        date: today,
        teamLeaderId: students[0].id, // Priya Sharma
        member2Id: students[1].id, // Rahul Kumar
        member3Id: students[3].id, // Amit Singh
        member4Id: students[2].id, // Anjali Patel (on leave but for demo)
        breakfast: 'Poha with Sev',
        lunch: 'Dal Makhani + Rice + Roti',
        snacks: 'Samosa + Chai',
        dinner: 'Mixed Veg + Paratha'
      }
    })

    // Create some sample swaps
    await db.dutySwap.create({
      data: {
        requesterId: students[1].id, // Rahul Kumar
        targetId: students[3].id, // Amit Singh
        dutyDate: new Date('2024-01-15'),
        reason: 'Family emergency',
        status: 'APPROVED',
        requesterApproved: true,
        targetApproved: true
      }
    })

    await db.dutySwap.create({
      data: {
        requesterId: students[2].id, // Anjali Patel
        targetId: students[4].id, // Neha Gupta
        dutyDate: new Date('2024-01-14'),
        reason: 'Doctor appointment',
        status: 'PENDING',
        requesterApproved: true,
        targetApproved: false
      }
    })

    console.log('Database seeded successfully!')
  } catch (error) {
    console.error('Error seeding database:', error)
  }
}

seedDatabase()