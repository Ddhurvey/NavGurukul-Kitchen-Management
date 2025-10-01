import PageWrapper from './page-wrapper'

export const dynamic = 'force-dynamic'

// Server-side data fetching
async function getStudents() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/students`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (!response.ok) {
      console.error('Failed to fetch students:', response.status, response.statusText)
      return []
    }
    
    const data = await response.json()
    console.log('Students data loaded:', data.length, 'students')
    return data
  } catch (error) {
    console.error('Error fetching students:', error)
    return []
  }
}

async function getKitchenDuties() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/kitchen-duty`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (!response.ok) {
      console.error('Failed to fetch kitchen duties:', response.status, response.statusText)
      return { today: null, tomorrow: null }
    }
    
    const data = await response.json()
    console.log('Kitchen duties loaded:', { 
      hasToday: !!data.today, 
      hasTomorrow: !!data.tomorrow 
    })
    return data
  } catch (error) {
    console.error('Error fetching kitchen duties:', error)
    return { today: null, tomorrow: null }
  }
}

async function getFoodMenu() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/food-menu`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (!response.ok) {
      console.error('Failed to fetch food menu:', response.status, response.statusText)
      return null
    }
    
    const data = await response.json()
    console.log('Food menu loaded:', !!data)
    return data
  } catch (error) {
    console.error('Error fetching food menu:', error)
    return null
  }
}

export default async function KitchenDutyDashboard() {
  console.log('Starting server-side data fetching...')
  
  // Fetch data on server side
  const [students, dutiesData, todayMenu] = await Promise.all([
    getStudents(),
    getKitchenDuties(),
    getFoodMenu()
  ])

  console.log('Server-side data loading complete:', {
    studentsCount: students.length,
    hasTodayDuty: !!dutiesData.today,
    hasTomorrowDuty: !!dutiesData.tomorrow,
    hasTodayMenu: !!todayMenu
  })

  // Pass data to client component
  return (
    <PageWrapper 
      initialStudents={students}
      initialTodayDuty={dutiesData.today}
      initialTomorrowDuty={dutiesData.tomorrow}
      initialTodayMenu={todayMenu}
    />
  )
}