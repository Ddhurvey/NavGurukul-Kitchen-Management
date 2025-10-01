'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Users, ChefHat, Bell, UserCheck, UserX, Clock, RefreshCw, User, Mail, MapPin, Building, Shield, Activity, Edit3, Key, Award, TrendingUp, CheckCircle, Settings, LogOut } from 'lucide-react'
import { useAuth } from './auth-context'
import { useRouter } from 'next/navigation'

interface Student {
  id: string
  name: string
  email: string
  foodPreference: string
  workAssignment?: string
  isActive: boolean
  isPresent: boolean
  isTeamMember: boolean
  isJobPlaced: boolean
  profileClosed: boolean
}

interface KitchenDuty {
  id: string
  date: string
  teamLeadId?: string
  teamLead?: Student
  assignments: {
    id: string
    student: Student
    isTeamLead: boolean
  }[]
}

interface FoodMenu {
  id: string
  date: string
  breakfast?: string
  lunch?: string
  snacks?: string
  dinner?: string
}

interface Props {
  initialStudents: Student[]
  initialTodayDuty: KitchenDuty | null
  initialTomorrowDuty: KitchenDuty | null
  initialTodayMenu: FoodMenu | null
}

export default function KitchenDutyDashboardClient({
  initialStudents,
  initialTodayDuty,
  initialTomorrowDuty,
  initialTodayMenu
}: Props) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [todayDuty, setTodayDuty] = useState<KitchenDuty | null>(initialTodayDuty)
  const [tomorrowDuty, setTomorrowDuty] = useState<KitchenDuty | null>(initialTomorrowDuty)
  const [todayMenu, setTodayMenu] = useState<FoodMenu | null>(initialTodayMenu)
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const { user, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    console.log('Client component mounted with data:', {
      studentsCount: students.length,
      hasTodayDuty: !!todayDuty,
      hasTomorrowDuty: !!tomorrowDuty,
      hasTodayMenu: !!todayMenu
    })
  }, [students, todayDuty, tomorrowDuty, todayMenu])

  const fetchData = async () => {
    try {
      setRefreshing(true)
      console.log('Refreshing data...')
      
      const [studentsRes, dutiesRes, menuRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/kitchen-duty'),
        fetch('/api/food-menu')
      ])

      if (!studentsRes.ok || !dutiesRes.ok || !menuRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [studentsData, dutiesData, menuData] = await Promise.all([
        studentsRes.json(),
        dutiesRes.json(),
        menuRes.json()
      ])

      setStudents(studentsData)
      setTodayDuty(dutiesData.today)
      setTomorrowDuty(dutiesData.tomorrow)
      setTodayMenu(menuData)
      
      console.log('Data refreshed successfully')
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleAutoAssign = async () => {
    try {
      setLoading(true)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const response = await fetch('/api/auto-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: tomorrow.toISOString()
        })
      })

      if (response.ok) {
        await fetchData()
        alert('Kitchen duty assigned successfully!')
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to assign kitchen duty')
      }
    } catch (error) {
      console.error('Error auto-assigning:', error)
      alert('Failed to assign kitchen duty')
    } finally {
      setLoading(false)
    }
  }

  const handleSendDiscordNotification = async () => {
    try {
      setLoading(true)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const response = await fetch('/api/discord-notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: tomorrow.toISOString()
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert('Discord notification sent successfully!')
        console.log('Message sent:', data.message)
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to send Discord notification')
      }
    } catch (error) {
      console.error('Error sending notification:', error)
      alert('Failed to send Discord notification')
    } finally {
      setLoading(false)
    }
  }

  const handleDailyNotification = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/daily-assignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (response.ok) {
        await fetchData()
        alert(`Daily assignment ${data.alreadyAssigned ? 'already exists' : 'completed successfully'}!`)
      } else {
        alert(data.error || 'Failed to perform daily assignment')
      }
    } catch (error) {
      console.error('Error in daily assignment:', error)
      alert('Failed to perform daily assignment')
    } finally {
      setLoading(false)
    }
  }

  const handleSendDailyNotification = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/discord-notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (response.ok) {
        alert('Daily notification sent successfully!')
        console.log('Message sent:', data.notification?.message)
      } else {
        alert(data.error || 'Failed to send daily notification')
      }
    } catch (error) {
      console.error('Error sending daily notification:', error)
      alert('Failed to send daily notification')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/auth')
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }

  const activeStudents = students.filter(s => s.isActive && s.isPresent && !s.isTeamMember && !s.profileClosed)
  const onLeaveStudents = students.filter(s => !s.isPresent)
  const teamMembers = students.filter(s => s.isTeamMember)
  const jobPlacedStudents = students.filter(s => s.isJobPlaced)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 sm:py-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <ChefHat className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">NavGurukul Kitchen Duty</h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Management System</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <User className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{user?.name}</span>
                <span className="sm:hidden">{user?.name?.split(' ')[0]}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSendDiscordNotification}
                disabled={loading}
                className="text-xs sm:text-sm"
              >
                <Bell className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Discord</span>
                <span className="sm:hidden">Notify</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchData}
                disabled={refreshing || loading}
                className="text-xs sm:text-sm"
              >
                <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">↻</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
                className="text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">↪</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Responsive Tab Navigation */}
          <div className="bg-white rounded-lg shadow-sm p-2 overflow-x-auto">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 h-auto">
              <TabsTrigger value="dashboard" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                <div className="flex flex-col items-center gap-1">
                  <Activity className="h-4 w-4" />
                  <span>Dashboard</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="duties" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                <div className="flex flex-col items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Duties</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="students" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                <div className="flex flex-col items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>Students</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="menu" className="text-xs sm:text-sm py-2 px-1 sm:px-3 hidden sm:block">
                <div className="flex flex-col items-center gap-1">
                  <ChefHat className="h-4 w-4" />
                  <span>Menu</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="profile" className="text-xs sm:text-sm py-2 px-1 sm:px-3 hidden sm:block">
                <div className="flex flex-col items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs sm:text-sm py-2 px-1 sm:px-3 hidden lg:block">
                <div className="flex flex-col items-center gap-1">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{students.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {activeStudents.length} active for duty
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">On Leave</CardTitle>
                  <UserX className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-red-600">{onLeaveStudents.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Currently unavailable
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Team Members</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">{teamMembers.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Exempt from duty
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Job Placed</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-purple-600">{jobPlacedStudents.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Profiles closed
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Kitchen Duties */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Today's Duty */}
              <Card className="bg-white shadow-md">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5" />
                    Today's Kitchen Duty
                  </CardTitle>
                  <CardDescription className="text-blue-100">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  {todayDuty ? (
                    <div className="space-y-4">
                      <div>
                        <div className="font-semibold text-blue-600 mb-2 flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Team Lead:
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-blue-600 text-white">T.L</Badge>
                            <span className="font-medium text-gray-800">
                              {todayDuty.assignments.find(a => a.isTeamLead)?.student.name || todayDuty.teamLead?.name}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-blue-600 mb-2 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Team Members:
                        </div>
                        <div className="space-y-2">
                          {todayDuty.assignments.filter(a => !a.isTeamLead).map((assignment) => (
                            <div key={assignment.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <Badge variant="outline" className="w-fit">Member</Badge>
                                <span className="font-medium text-gray-800">{assignment.student.name}</span>
                                <Badge variant="secondary" className="w-fit sm:ml-auto">
                                  {assignment.student.foodPreference}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 sm:py-8">
                      <UserX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4 text-sm sm:text-base">No kitchen duty assigned for today</p>
                      <Button onClick={handleAutoAssign} size="sm" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                        {loading ? 'Assigning...' : 'Auto-Assign Today\'s Duty'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tomorrow's Duty */}
              <Card className="bg-white shadow-md">
                <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5" />
                    Tomorrow's Kitchen Duty
                  </CardTitle>
                  <CardDescription className="text-green-100">
                    {new Date(Date.now() + 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  {tomorrowDuty ? (
                    <div className="space-y-4">
                      <div>
                        <div className="font-semibold text-green-600 mb-2 flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Team Lead:
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-green-600 text-white">T.L</Badge>
                            <span className="font-medium text-gray-800">
                              {tomorrowDuty.assignments.find(a => a.isTeamLead)?.student.name || tomorrowDuty.teamLead?.name}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-green-600 mb-2 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Team Members:
                        </div>
                        <div className="space-y-2">
                          {tomorrowDuty.assignments.filter(a => !a.isTeamLead).map((assignment) => (
                            <div key={assignment.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <Badge variant="outline" className="w-fit">Member</Badge>
                                <span className="font-medium text-gray-800">{assignment.student.name}</span>
                                <Badge variant="secondary" className="w-fit sm:ml-auto">
                                  {assignment.student.foodPreference}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 sm:py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4 text-sm sm:text-base">No kitchen duty assigned for tomorrow</p>
                      <Button onClick={handleAutoAssign} size="sm" disabled={loading} className="bg-green-600 hover:bg-green-700">
                        {loading ? 'Assigning...' : 'Auto-Assign Tomorrow\'s Duty'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Today's Menu */}
            <Card className="bg-white shadow-md">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ChefHat className="h-5 w-5" />
                  Today's Food Menu
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {todayMenu ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <div className="font-semibold text-orange-600 mb-2 flex items-center gap-2">
                        <div className="bg-orange-200 p-1 rounded">
                          <ChefHat className="h-3 w-3" />
                        </div>
                        Breakfast
                      </div>
                      <div className="text-gray-700 text-sm">{todayMenu.breakfast || 'Not specified'}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="font-semibold text-green-600 mb-2 flex items-center gap-2">
                        <div className="bg-green-200 p-1 rounded">
                          <ChefHat className="h-3 w-3" />
                        </div>
                        Lunch
                      </div>
                      <div className="text-gray-700 text-sm">{todayMenu.lunch || 'Not specified'}</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <div className="font-semibold text-yellow-600 mb-2 flex items-center gap-2">
                        <div className="bg-yellow-200 p-1 rounded">
                          <ChefHat className="h-3 w-3" />
                        </div>
                        Snacks
                      </div>
                      <div className="text-gray-700 text-sm">{todayMenu.snacks || 'Not specified'}</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <div className="font-semibold text-purple-600 mb-2 flex items-center gap-2">
                        <div className="bg-purple-200 p-1 rounded">
                          <ChefHat className="h-3 w-3" />
                        </div>
                        Dinner
                      </div>
                      <div className="text-gray-700 text-sm">{todayMenu.dinner || 'Not specified'}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 sm:py-12">
                    <ChefHat className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-6 text-sm sm:text-base">No menu set for today</p>
                    <Button variant="outline" size="sm" className="border-orange-300 text-orange-600 hover:bg-orange-50">
                      Set Today's Menu
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other Tabs - Placeholder Content */}
          <TabsContent value="duties" className="space-y-6">
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Kitchen Duties Management
                </CardTitle>
                <CardDescription>
                  View and manage kitchen duty assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Kitchen duties management features coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            {/* Student Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card className="bg-white shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{students.length}</div>
                  <p className="text-xs text-muted-foreground">All students</p>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Active</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">{activeStudents.length}</div>
                  <p className="text-xs text-muted-foreground">Available for duty</p>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">On Leave</CardTitle>
                  <UserX className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-red-600">{onLeaveStudents.length}</div>
                  <p className="text-xs text-muted-foreground">Unavailable</p>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Team Members</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-purple-600">{teamMembers.length}</div>
                  <p className="text-xs text-muted-foreground">Food coordinators</p>
                </CardContent>
              </Card>
            </div>

            {/* Selected Student Profile */}
            {selectedStudent && (
              <Card className="bg-white shadow-md border-l-4 border-l-blue-500">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Student Profile
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedStudent(null)}
                    >
                      ✕
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Name</label>
                        <p className="text-lg font-semibold">{selectedStudent.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-sm break-all">{selectedStudent.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Work Assignment</label>
                        <p className="text-sm">{selectedStudent.workAssignment || 'Not assigned'}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Food Preference</label>
                        <div className="mt-1">
                          <Badge variant={selectedStudent.foodPreference === 'egg' ? 'default' : 'secondary'}>
                            {selectedStudent.foodPreference === 'egg' ? '🥚 Egg' : '🧀 Paneer'}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <div className="mt-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${selectedStudent.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-sm">{selectedStudent.isActive ? 'Active' : 'Inactive'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${selectedStudent.isPresent ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-sm">{selectedStudent.isPresent ? 'Present' : 'Absent'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Roles</label>
                        <div className="mt-1 space-y-1">
                          {selectedStudent.isTeamMember && (
                            <Badge variant="outline" className="text-purple-600 border-purple-600">
                              👑 Team Member
                            </Badge>
                          )}
                          {selectedStudent.isJobPlaced && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              💼 Job Placed
                            </Badge>
                          )}
                          {selectedStudent.profileClosed && (
                            <Badge variant="outline" className="text-red-600 border-red-600">
                              📁 Profile Closed
                            </Badge>
                          )}
                          {!selectedStudent.isTeamMember && !selectedStudent.isJobPlaced && !selectedStudent.profileClosed && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              🍳 Kitchen Duty
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Students List */}
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  All Students ({students.length})
                </CardTitle>
                <CardDescription>
                  Click on any student to view their detailed profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-900">Name</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-900">Work</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-900">Eats</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-900">Status</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-900">Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {students.map((student) => (
                          <tr 
                            key={student.id}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => setSelectedStudent(student)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  student.isActive && student.isPresent ? 'bg-green-500' : 'bg-red-500'
                                }`}></div>
                                <span className="font-medium">{student.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-xs">
                                {student.workAssignment || 'None'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className="text-xs">
                                {student.foodPreference === 'egg' ? '🥚' : '🧀'} {student.foodPreference}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge 
                                variant={student.isActive && student.isPresent ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {student.isActive && student.isPresent ? 'Active' : 'Leave'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                {student.isTeamMember && (
                                  <Badge variant="outline" className="text-xs text-purple-600 border-purple-600">
                                    👑
                                  </Badge>
                                )}
                                {student.isJobPlaced && (
                                  <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600">
                                    💼
                                  </Badge>
                                )}
                                {student.profileClosed && (
                                  <Badge variant="outline" className="text-xs text-red-600 border-red-600">
                                    📁
                                  </Badge>
                                )}
                                {!student.isTeamMember && !student.isJobPlaced && !student.profileClosed && (
                                  <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                                    🍳
                                  </Badge>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="menu" className="space-y-6">
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  Food Menu Management
                </CardTitle>
                <CardDescription>
                  Plan and manage daily food menus
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <ChefHat className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Food menu management features coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  User Profile
                </CardTitle>
                <CardDescription>
                  Manage your profile and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Profile management features coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Settings
                </CardTitle>
                <CardDescription>
                  Configure system settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Kitchen Duty Assignment</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Automatically assign kitchen duties to eligible students for tomorrow.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Manual Assignment</CardTitle>
                        <CardDescription className="text-sm">
                          Assign tomorrow's kitchen duty manually
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          onClick={handleAutoAssign} 
                          size="sm" 
                          disabled={loading}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                          Auto-Assign for Tomorrow
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Daily Assignment</CardTitle>
                        <CardDescription className="text-sm">
                          Run the daily 9 PM assignment process
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          onClick={handleDailyNotification} 
                          size="sm" 
                          disabled={loading}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Daily 9 PM Assignment
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Send Notification</CardTitle>
                        <CardDescription className="text-sm">
                          Send daily Discord notification
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          onClick={handleSendDailyNotification} 
                          size="sm" 
                          disabled={loading}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                          <Bell className="h-4 w-4 mr-2" />
                          Send Daily Notification
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Leave Management</CardTitle>
                        <CardDescription className="text-sm">
                          9 PM cutoff for tomorrow's duty
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-gray-600">
                          <div className="font-medium">Status:</div>
                          <div className="text-green-600">✅ Accepting leave requests</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Cutoff at 9:00 PM
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Daily assignment runs automatically at 9 PM</li>
                      <li>• Round-robin rotation ensures fairness</li>
                      <li>• Sunday teams include both egg & paneer preferences</li>
                      <li>• Leave requests accepted until 9 PM cutoff</li>
                      <li>• Discord notifications sent at 9 PM daily</li>
                      <li>• Complete history tracking maintained</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}