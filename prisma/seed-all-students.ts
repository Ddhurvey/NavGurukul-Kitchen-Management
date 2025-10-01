import { PrismaClient } from '@prisma/client'
import { db } from '../src/lib/db'

async function main() {
  console.log('Seeding database with all 47 students...')

  // Clear existing data
  console.log('Clearing existing data...')
  await db.swapRequest.deleteMany()
  await db.dutyAssignment.deleteMany()
  await db.kitchenDuty.deleteMany()
  await db.foodMenu.deleteMany()
  await db.leave.deleteMany()
  await db.foodCoordinator.deleteMany()
  await db.student.deleteMany()

  // All students from the provided list
  const studentsData = [
    { name: 'Abhishek', work: 'Kitchen', food: 'Eggs', status: 'Active', email: 'abhishek@navgurukul.org' },
    { name: 'Afatab', work: 'Kitchen', food: 'Eggs', status: 'Active', email: 'afatab@navgurukul.org' },
    { name: 'Ajay Baghel', work: 'None', food: 'Paneer', status: 'Leave', email: 'ajay@navgurukul.org' },
    { name: 'Akash Halder', work: 'Kitchen', food: 'Eggs', status: 'Active', email: 'akash@navgurukul.org' },
    { name: 'Alok Shukla', work: 'None', food: 'Eggs', status: 'Leave', email: 'alok@navgurukul.org' },
    { name: 'Amit Yadav', work: 'None', food: 'Eggs', status: 'Active', email: 'amit@navgurukul.org' },
    { name: 'Ankit Kumar', work: 'None', food: 'Paneer', status: 'Leave', email: 'ankit.k@navgurukul.org' },
    { name: 'Ankit Verma', work: 'Kitchen', food: 'Paneer', status: 'Active', email: 'ankit.v@navgurukul.org' },
    { name: 'Ankush', work: 'Kitchen', food: 'Paneer', status: 'Active', email: 'ankush@navgurukul.org' },
    { name: 'Anubhav Patel', work: 'Kitchen', food: 'Eggs', status: 'Active', email: 'anubhav@navgurukul.org' },
    { name: 'Anurag', work: 'Kitchen', food: 'Paneer', status: 'Active', email: 'anurag@navgurukul.org' },
    { name: 'Arhan', work: 'Kitchen', food: 'Eggs', status: 'Active', email: 'arhan@navgurukul.org' },
    { name: 'Aryan', work: 'None', food: 'Eggs', status: 'Leave', email: 'aryan@navgurukul.org' },
    { name: 'Bhavesh', work: 'Kitchen', food: 'Eggs', status: 'Active', email: 'bhavesh@navgurukul.org' },
    { name: 'Deep Tiwari', work: 'Kitchen', food: 'Paneer', status: 'Active', email: 'deep@navgurukul.org' },
    { name: 'Devendra', work: 'Kitchen', food: 'Eggs', status: 'Active', email: 'devendra@navgurukul.org' },
    { name: 'Faiyaz usmani', work: 'Kitchen', food: 'Eggs', status: 'Active', email: 'faiyaz@navgurukul.org' },
    { name: 'Gopal Nakpuri', work: 'Kitchen', food: 'Paneer', status: 'Active', email: 'gopal@navgurukul.org' },
    { name: 'Govind', work: 'Kitchen', food: 'Eggs', status: 'Active', email: 'govind@navgurukul.org' },
    { name: 'Harsh Trivedi', work: 'None', food: 'Paneer', status: 'Leave', email: 'harsh@navgurukul.org' },
    { name: 'Harshit', work: 'Kitchen', food: 'Eggs', status: 'Leave', email: 'harshit@navgurukul.org' },
    { name: 'Hemraj Thapa', work: 'None', food: 'Eggs', status: 'Leave', email: 'hemraj@navgurukul.org' },
    { name: 'Lokesh', work: 'Kitchen', food: 'Paneer', status: 'Active', email: 'lokesh@navgurukul.org' },
    { name: 'Neeraj', work: 'Kitchen', food: 'Eggs', status: 'Active', email: 'neeraj@navgurukul.org' },
    { name: 'Prashant kumar', work: 'Team', food: 'Eggs', status: 'Active', email: 'prashant@navgurukul.org' },
    { name: 'Ravi', work: 'None', food: 'Eggs', status: 'Leave', email: 'ravi@navgurukul.org' },
    { name: 'Ravindra', work: 'Kitchen', food: 'Eggs', status: 'Active', email: 'ravindra@navgurukul.org' },
    { name: 'Riyan', work: 'Kitchen', food: 'Eggs', status: 'Active', email: 'riyan@navgurukul.org' },
    { name: 'Rohit Gopale', work: 'Kitchen', food: 'Eggs', status: 'Active', email: 'rohit.g@navgurukul.org' },
    { name: 'Rohit Verma', work: 'Kitchen', food: 'Paneer', status: 'Active', email: 'rohit.v@navgurukul.org' },
    { name: 'Roushan', work: 'Kitchen', food: 'Paneer', status: 'Active', email: 'roushan@navgurukul.org' },
    { name: 'Sachin', work: 'Team', food: 'Eggs', status: 'Active', email: 'sachin@navgurukul.org' },
    { name: 'Sanjay', work: 'Kitchen', food: 'Eggs', status: 'Active', email: 'sanjay@navgurukul.org' },
    { name: 'Shivam Mishra', work: 'None', food: 'Paneer', status: 'Leave', email: 'shivam.m@navgurukul.org' },
    { name: 'Shivraj', work: 'None', food: 'Paneer', status: 'Leave', email: 'shivraj@navgurukul.org' },
    { name: 'Shri krishna', work: 'Kitchen', food: 'Paneer', status: 'Active', email: 'shri@navgurukul.org' },
    { name: 'Sohan Vishwas', work: 'None', food: 'Eggs', status: 'Leave', email: 'sohan@navgurukul.org' },
    { name: 'Sonu Baghel', work: 'None', food: 'Eggs', status: 'Leave', email: 'sonu.b@navgurukul.org' },
    { name: 'Sonu Kathat', work: 'Kitchen', food: 'Eggs', status: 'Active', email: 'sonu.k@navgurukul.org' },
    { name: 'Subham', work: 'None', food: 'Eggs', status: 'Leave', email: 'subham@navgurukul.org' },
    { name: 'Sujit', work: 'Kitchen', food: 'Eggs', status: 'Active', email: 'sujit@navgurukul.org' },
    { name: 'Sumit', work: 'Kitchen', food: 'Eggs', status: 'Active', email: 'sumit@navgurukul.org' },
    { name: 'Sunil kumar', work: 'Kitchen', food: 'Eggs', status: 'Active', email: 'sunil@navgurukul.org' },
    { name: 'Tikaram', work: 'Kitchen', food: 'Eggs', status: 'Active', email: 'tikaram@navgurukul.org' },
    { name: 'Tushar', work: 'Kitchen', food: 'Eggs', status: 'Active', email: 'tushar@navgurukul.org' },
    { name: 'Uttam', work: 'Kitchen', food: 'Eggs', status: 'Active', email: 'uttam@navgurukul.org' },
    { name: 'Vicky', work: 'Kitchen', food: 'Paneer', status: 'Active', email: 'vicky@navgurukul.org' },
    { name: 'Vishwanath', work: 'Kitchen', food: 'Paneer', status: 'Active', email: 'vishwanath@navgurukul.org' },
    { name: 'Yash', work: 'Kitchen', food: 'Eggs', status: 'Active', email: 'yash@navgurukul.org' },
    { name: 'Yogesh', work: 'Kitchen', food: 'Paneer', status: 'Active', email: 'yogesh@navgurukul.org' },
    { name: 'Yogesh Kumar', work: 'Kitchen', food: 'Paneer', status: 'Active', email: 'yogesh.k@navgurukul.org' }
  ]

  // Create all students
  const students = await Promise.all(
    studentsData.map((studentData, index) => 
      db.student.create({
        data: {
          name: studentData.name,
          email: studentData.email,
          foodPreference: studentData.food.toLowerCase().includes('egg') ? 'egg' : 'paneer',
          workAssignment: studentData.work,
          isActive: studentData.status === 'Active',
          isPresent: studentData.status === 'Active',
          isTeamMember: studentData.work === 'Team',
          isJobPlaced: false,
          profileClosed: false
        }
      })
    )
  )

  console.log(`Created ${students.length} students`)

  // Count active students for kitchen duty
  const activeStudents = students.filter(s => s.isActive && s.isPresent)
  console.log(`Active students for duty: ${activeStudents.length}`)

  // Create Food Coordinators (Team members)
  const teamMembers = students.filter(s => s.isTeamMember)
  if (teamMembers.length > 0) {
    for (const teamMember of teamMembers) {
      await db.foodCoordinator.create({
        data: {
          studentId: teamMember.id,
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
          isActive: true
        }
      })
    }
    console.log(`Created ${teamMembers.length} Food Coordinators`)
  }

  // Create today's food menu
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (teamMembers.length > 0) {
    const fc = await db.foodCoordinator.findFirst({
      where: { isActive: true }
    })

    if (fc) {
      await db.foodMenu.create({
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
    }
  }

  console.log('\n✅ Database seeded successfully with all students!')
  console.log('\n📊 Summary:')
  console.log(`- Total Students: ${students.length}`)
  console.log(`- Active for Duty: ${activeStudents.length}`)
  console.log(`- On Leave: ${students.filter(s => !s.isActive || !s.isPresent).length}`)
  console.log(`- Food Preferences: ${students.filter(s => s.foodPreference === 'paneer').length} Paneer, ${students.filter(s => s.foodPreference === 'egg').length} Egg`)
  console.log(`- Work Assignments: ${students.filter(s => s.workAssignment === 'Kitchen').length} Kitchen, ${students.filter(s => s.workAssignment === 'Team').length} Team, ${students.filter(s => s.workAssignment === 'None').length} None`)
  console.log(`- Food Coordinators: ${teamMembers.length}`)
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })