// Script to populate the database with the provided student data
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const students = [
  { name: 'Abhishek', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Afatab', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Akash Halder', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Amit Yadav', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Ankush', role: 'STUDENT', foodPreference: 'PANEER', status: 'ACTIVE' },
  { name: 'Anubhav Patel', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Anurag', role: 'STUDENT', foodPreference: 'PANEER', status: 'ACTIVE' },
  { name: 'Arhan', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Bhavesh', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Deep Tiwari', role: 'STUDENT', foodPreference: 'PANEER', status: 'ACTIVE' },
  { name: 'Devendra', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Faiyaz Usmani', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Gopal Nakpuri', role: 'STUDENT', foodPreference: 'PANEER', status: 'ACTIVE' },
  { name: 'Govind', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Lokesh', role: 'STUDENT', foodPreference: 'PANEER', status: 'ACTIVE' },
  { name: 'Neeraj', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Ravindra', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Riyan', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Rohit Gopale', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Rohit Verma', role: 'STUDENT', foodPreference: 'PANEER', status: 'ACTIVE' },
  { name: 'Roushan', role: 'STUDENT', foodPreference: 'PANEER', status: 'ACTIVE' },
  { name: 'Sanjay', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Shri Krishna', role: 'STUDENT', foodPreference: 'PANEER', status: 'ACTIVE' },
  { name: 'Sonu Kathat', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Sujit', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Sumit', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Sunil Kumar', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Tikaram', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Tushar', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Uttam', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Vicky', role: 'STUDENT', foodPreference: 'PANEER', status: 'ACTIVE' },
  { name: 'Vishwanath', role: 'STUDENT', foodPreference: 'PANEER', status: 'ACTIVE' },
  { name: 'Yash', role: 'STUDENT', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Yogesh', role: 'STUDENT', foodPreference: 'PANEER', status: 'ACTIVE' },
  { name: 'Yogesh Kumar', role: 'STUDENT', foodPreference: 'PANEER', status: 'ACTIVE' }
]

const teamMembers = [
  { name: 'Team Member 1', role: 'TEAM_MEMBER', foodPreference: 'EGGS', status: 'ACTIVE' },
  { name: 'Team Member 2', role: 'TEAM_MEMBER', foodPreference: 'PANEER', status: 'ACTIVE' },
  { name: 'Team Member 3', role: 'TEAM_MEMBER', foodPreference: 'EGGS', status: 'ACTIVE' }
]

async function populateStudents() {
  try {
    console.log('Starting to populate students...')
    
    // Clear existing students (optional - comment out if you want to keep existing data)
    // await prisma.user.deleteMany({
    //   where: { role: 'STUDENT' }
    // })
    
    // Add students
    for (const student of students) {
      const email = student.name.toLowerCase().replace(/\s+/g, '.') + '@navgurukul.org'
      
      await prisma.user.upsert({
        where: { email },
        update: {
          role: student.role,
          foodPreference: student.foodPreference,
          status: student.status,
          updatedAt: new Date()
        },
        create: {
          name: student.name,
          email: email,
          password: 'password123', // Default password
          role: student.role,
          foodPreference: student.foodPreference,
          status: student.status,
          totalKitchenTurns: Math.floor(Math.random() * 20), // Random turns between 0-19
          leaveDays: Math.floor(Math.random() * 5), // Random leave days between 0-4
          rotationPosition: 0
        }
      })
    }
    
    // Add team members
    for (const member of teamMembers) {
      const email = member.name.toLowerCase().replace(/\s+/g, '.') + '@navgurukul.org'
      
      await prisma.user.upsert({
        where: { email },
        update: {
          role: member.role,
          foodPreference: member.foodPreference,
          status: member.status,
          updatedAt: new Date()
        },
        create: {
          name: member.name,
          email: email,
          password: 'password123',
          role: member.role,
          foodPreference: member.foodPreference,
          status: member.status,
          totalKitchenTurns: 0,
          leaveDays: 0,
          rotationPosition: 0
        }
      })
    }
    
    console.log('Successfully populated students and team members!')
    
    // Get statistics
    const totalActive = await prisma.user.count({
      where: { status: 'ACTIVE' }
    })
    
    const eggsCount = await prisma.user.count({
      where: { 
        status: 'ACTIVE',
        foodPreference: 'EGGS'
      }
    })
    
    const paneerCount = await prisma.user.count({
      where: { 
        status: 'ACTIVE',
        foodPreference: 'PANEER'
      }
    })
    
    const studentsCount = await prisma.user.count({
      where: { 
        status: 'ACTIVE',
        role: 'STUDENT'
      }
    })
    
    console.log('\n=== Population Summary ===')
    console.log(`Total Active: ${totalActive}`)
    console.log(`Eggs: ${eggsCount}`)
    console.log(`Paneer: ${paneerCount}`)
    console.log(`Students (Kitchen Eligible): ${studentsCount}`)
    console.log(`Team Members: ${teamMembers.length}`)
    
  } catch (error) {
    console.error('Error populating students:', error)
  } finally {
    await prisma.$disconnect()
  }
}

populateStudents()