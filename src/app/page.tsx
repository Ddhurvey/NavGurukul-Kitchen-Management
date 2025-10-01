'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RoleGuard, PermissionGuard } from '@/components/RoleGuard'
import { Users, ChefHat, Calendar, TrendingUp, AlertCircle, CheckCircle, Clock, MessageSquare, Plus, Edit, Trash2, ThumbsUp, ThumbsDown } from 'lucide-react'
import AuthPage from '@/components/AuthPage'
import UserProfile from '@/components/UserProfile'
import StudentProfile from '@/components/StudentProfile'
import WeeklyMenu from '@/components/WeeklyMenu'
import WeeklyMenuSection from '@/components/WeeklyMenuSection'

interface DashboardStats {
  totalStudents: number
  activeStudents: number
  onLeaveStudents: number
  placedStudents: number
  eggEaters: number
  paneerEaters: number
  kitchenTeam: number
  teamMembers: number
  totalDutiesThisMonth: number
}

interface TodayDuty {
  id?: string
  date: string
  teamLeader: string
  members: string[]
  menu: {
    breakfast: string
    lunch: string
    snacks: string
    dinner: string
  }
}

interface RecentSwap {
  id: string
  requester: string
  target: string
  date: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
}

export default function Dashboard() {
  const { user, token, isLoading } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeStudents: 0,
    onLeaveStudents: 0,
    placedStudents: 0,
    eggEaters: 0,
    paneerEaters: 0,
    kitchenTeam: 0,
    teamMembers: 0,
    totalDutiesThisMonth: 0
  })

  const [todayDuty, setTodayDuty] = useState<TodayDuty | null>(null)
  const [recentSwaps, setRecentSwaps] = useState<RecentSwap[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    if (user && token) {
      setDataLoading(true)
      fetchData()
    }
  }, [user, token])

  const fetchData = async () => {
    try {
      // Fetch dashboard stats
      const statsResponse = await fetch('/api/dashboard/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      // Fetch today's duty
      const dutyResponse = await fetch('/api/kitchen-duty')
      if (dutyResponse.ok) {
        const dutyData = await dutyResponse.json()
        setTodayDuty({
          id: dutyData.id,
          date: dutyData.date,
          teamLeader: dutyData.teamLeader.name,
          members: dutyData.members.map((m: any) => m.name),
          menu: {
            breakfast: dutyData.menu.breakfast || 'Poha with Sev',
            lunch: dutyData.menu.lunch || 'Dal Makhani + Rice + Roti',
            snacks: dutyData.menu.snacks || 'Samosa + Chai',
            dinner: dutyData.menu.dinner || 'Mixed Veg + Paratha'
          }
        })
      }

      // Fetch recent swaps
      const swapsResponse = await fetch('/api/swaps')
      if (swapsResponse.ok) {
        const swapsData = await swapsResponse.json()
        setRecentSwaps(swapsData.map((swap: any) => ({
          id: swap.id,
          requester: swap.requester.name,
          target: swap.target.name,
          date: swap.dutyDate,
          reason: swap.reason,
          status: swap.status
        })))
      }

      // Fetch students
      const studentsResponse = await fetch('/api/students')
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json()
        setStudents(studentsData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setDataLoading(false)
    }
  }

  const handleSwapAction = async (swapId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/swaps/${swapId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action,
          userId: user.id 
        }),
      })

      if (response.ok) {
        // Refresh the swaps data
        const swapsResponse = await fetch('/api/swaps')
        if (swapsResponse.ok) {
          const swapsData = await swapsResponse.json()
          setRecentSwaps(swapsData.map((swap: any) => ({
            id: swap.id,
            requester: swap.requester.name,
            target: swap.target.name,
            date: swap.dutyDate,
            reason: swap.reason,
            status: swap.status
          })))
        }
        
        // Also refresh the kitchen duty to show updated assignments
        const dutyResponse = await fetch('/api/kitchen-duty')
        if (dutyResponse.ok) {
          const dutyData = await dutyResponse.json()
          setTodayDuty({
            id: dutyData.id,
            date: dutyData.date,
            teamLeader: dutyData.teamLeader.name,
            members: dutyData.members.map((m: any) => m.name),
            menu: {
              breakfast: dutyData.menu.breakfast || 'Poha with Sev',
              lunch: dutyData.menu.lunch || 'Dal Makhani + Rice + Roti',
              snacks: dutyData.menu.snacks || 'Samosa + Chai',
              dinner: dutyData.menu.dinner || 'Mixed Veg + Paratha'
            }
          })
        }
      } else {
        const errorData = await response.json()
        console.error('Failed to update swap:', errorData.error)
        alert(`Failed to ${action} swap: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error updating swap:', error)
      alert(`Failed to ${action} swap. Please try again.`)
    }
  }

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Show auth page if user is not logged in
  if (!user) {
    return <AuthPage />
  }

  const StatCard = ({ title, value, icon: Icon, description, color = 'default' }: {
    title: string
    value: string | number
    icon: any
    description?: string
    color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning'
  }) => {
    const colorClasses = {
      default: 'text-gray-600',
      primary: 'text-blue-600',
      secondary: 'text-purple-600',
      success: 'text-green-600',
      warning: 'text-orange-600'
    }

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${colorClasses[color]}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              NavGurukul Kitchen Management
            </h1>
            <p className="text-gray-600">
              Automated kitchen duty assignment and student management system
            </p>
          </div>
          <div className="flex gap-2">
            <RoleGuard allowedRoles={['FC', 'TEAM_MEMBER']}>
              <Button 
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/auto-assign')
                    if (response.ok) {
                      const data = await response.json()
                      alert(`Created ${data.assignments?.length || 0} duty assignments for the next 7 days!`)
                      window.location.reload()
                    } else {
                      alert('Failed to auto-assign duties')
                    }
                  } catch (error) {
                    alert('Error auto-assigning duties')
                  }
                }}
              >
                Auto-Assign Next 7 Days
              </Button>
              <Button 
                variant="outline"
                onClick={async () => {
                  if (confirm('This will sync all kitchen duties with history records. Continue?')) {
                    try {
                      const response = await fetch('/api/sync-kitchen-history', { method: 'POST' })
                      if (response.ok) {
                        const data = await response.json()
                        alert(`Sync completed! Created ${data.stats.newHistoryRecordsCreated} new records, updated ${data.stats.existingHistoryRecordsUpdated} existing records.`)
                        window.location.reload()
                      } else {
                        alert('Failed to sync kitchen history')
                      }
                    } catch (error) {
                      alert('Error syncing kitchen history')
                    }
                  }
                }}
              >
                Sync Kitchen History
              </Button>
            </RoleGuard>
            <Button 
              onClick={async () => {
                try {
                  const response = await fetch('/api/discord/notify')
                  if (response.ok) {
                    alert('Daily Discord notification sent successfully!')
                  } else {
                    alert('Failed to send daily notification')
                  }
                } catch (error) {
                  alert('Error sending daily notification')
                }
              }}
            >
              Send Daily Notification
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* User Profile */}
          <div className="lg:col-span-1">
            <UserProfile />
          </div>
          
          {/* Stats Grid */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            <StatCard
              title="Total Students"
              value={stats.totalStudents}
              icon={Users}
              description={`${stats.activeStudents} active, ${stats.onLeaveStudents} on leave`}
              color="primary"
            />
            <StatCard
              title="Food Preferences"
              value={`${stats.eggEaters} 🥚 | ${stats.paneerEaters} 🧀`}
              icon={ChefHat}
              description="Egg vs Paneer preference split"
              color="secondary"
            />
            <StatCard
              title="Duties This Month"
              value={stats.totalDutiesThisMonth}
              icon={Calendar}
              description="Total kitchen duties assigned"
              color="success"
            />
            <StatCard
              title="Team Distribution"
              value={`${stats.kitchenTeam} Kitchen | ${stats.teamMembers} Team`}
              icon={TrendingUp}
              description="Work type distribution"
              color="warning"
            />
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="today" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="today">Today's Duty</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="menu">Weekly Menu</TabsTrigger>
            <TabsTrigger value="swaps">Swap Requests</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Kitchen Duty */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChefHat className="h-5 w-5" />
                    Today's Kitchen Duty
                  </CardTitle>
                  <CardDescription>
                    {todayDuty?.date && new Date(todayDuty.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Team Leader</Badge>
                      <span className="font-medium">{todayDuty?.teamLeader}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-700">Team Members:</p>
                      {todayDuty?.members.map((member, index) => (
                        <div key={index} className="flex items-center gap-2 ml-4">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm">{member}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/discord/notify', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ type: 'duty', id: todayDuty?.id || '' })
                        })
                        if (response.ok) {
                          alert('Discord notification sent successfully!')
                        } else {
                          alert('Failed to send Discord notification')
                        }
                      } catch (error) {
                        alert('Error sending notification')
                      }
                    }}
                    disabled={dataLoading}
                  >
                    {dataLoading ? 'Sending...' : 'Send Discord Notification'}
                  </Button>
                </CardContent>
              </Card>

              {/* Today's Menu */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Today's Menu
                  </CardTitle>
                  <CardDescription>Daily meal plan</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Breakfast</p>
                      <p className="text-sm">{todayDuty?.menu.breakfast}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Lunch</p>
                      <p className="text-sm">{todayDuty?.menu.lunch}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Snacks</p>
                      <p className="text-sm">{todayDuty?.menu.snacks}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Dinner</p>
                      <p className="text-sm">{todayDuty?.menu.dinner}</p>
                    </div>
                  </div>
                  <RoleGuard allowedRoles={['FC', 'TEAM_MEMBER']}>
                    <Button variant="outline" className="w-full">
                      Edit Menu
                    </Button>
                  </RoleGuard>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Student Management</CardTitle>
                <CardDescription>
                  Manage student profiles, roles, and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Work Type</TableHead>
                      <TableHead>Food Preference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.length > 0 ? (
                      students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>
                            <Badge variant={student.workType === 'KITCHEN' ? 'secondary' : 'outline'}>
                              {student.workType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={student.foodPreference === 'PANEER' ? 'default' : 'outline'}>
                              {student.foodPreference === 'PANEER' ? 'Paneer 🧀' : 'Egg 🥚'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                student.status === 'ACTIVE' ? 'default' :
                                student.status === 'LEAVE' ? 'secondary' : 'outline'
                              }
                            >
                              {student.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <StudentProfile student={student} />
                              {user?.role === 'FC' && (
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          {dataLoading ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                          ) : (
                            <p className="text-gray-500">No students found</p>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="menu" className="space-y-4">
            <WeeklyMenuSection />
            <WeeklyMenu students={students} />
          </TabsContent>

          <TabsContent value="swaps" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Recent Swap Requests
                </CardTitle>
                <CardDescription>
                  Duty swap requests and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing recent duty swap requests
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      fetch('/api/swaps')
                        .then(response => response.json())
                        .then(swapsData => {
                          setRecentSwaps(swapsData.map((swap: any) => ({
                            id: swap.id,
                            requester: swap.requester.name,
                            target: swap.target.name,
                            date: swap.dutyDate,
                            reason: swap.reason,
                            status: swap.status
                          })))
                        })
                        .catch(error => console.error('Error refreshing swaps:', error))
                    }}
                    className="flex items-center gap-1"
                  >
                    Refresh
                  </Button>
                </div>
                <div className="space-y-4">
                  {recentSwaps.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No swap requests found
                    </div>
                  ) : (
                    recentSwaps.map((swap) => (
                      <div key={swap.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{swap.requester}</span>
                            <span className="text-gray-500">↔</span>
                            <span className="font-medium">{swap.target}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(swap.date).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-600 max-w-md">
                            {swap.reason}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {swap.status === 'PENDING' && (
                            <>
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Pending
                              </Badge>
                              <PermissionGuard permission="APPROVE_SWAP">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSwapAction(swap.id, 'approve')}
                                  className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSwapAction(swap.id, 'reject')}
                                  className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <ThumbsDown className="h-3 w-3" />
                                  Reject
                                </Button>
                              </PermissionGuard>
                            </>
                          )}
                          {swap.status === 'APPROVED' && (
                            <Badge variant="default" className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Approved
                            </Badge>
                          )}
                          {swap.status === 'REJECTED' && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Rejected
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* <TabsContent value="management" className="space-y-4">
            <RoleGuard requiredRole="FC">
              <StudentManagement currentUser={{ id: user.id, name: user.name, email: user.email }} />
            </RoleGuard>
          </TabsContent> */}

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Food Preference Distribution</CardTitle>
                  <CardDescription>Student food preferences breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Paneer Eaters</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: '55%' }}></div>
                        </div>
                        <span className="text-sm text-gray-600">{stats.paneerEaters}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Egg Eaters</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-orange-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                        </div>
                        <span className="text-sm text-gray-600">{stats.eggEaters}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Student Status Overview</CardTitle>
                  <CardDescription>Current student status distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Active</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: '84%' }}></div>
                        </div>
                        <span className="text-sm text-gray-600">{stats.activeStudents}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">On Leave</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '9%' }}></div>
                        </div>
                        <span className="text-sm text-gray-600">{stats.onLeaveStudents}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Placed</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-purple-500 h-2 rounded-full" style={{ width: '7%' }}></div>
                        </div>
                        <span className="text-sm text-gray-600">{stats.placedStudents}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}