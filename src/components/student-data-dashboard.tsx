'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { 
  Users, 
  ChefHat, 
  Egg, 
  Coffee, 
  Calendar, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Activity
} from 'lucide-react'

interface Student {
  id: string
  name: string
  email: string
  role: string
  status: string
  foodPreference: string
  totalKitchenTurns: number
  leaveDays: number
  worksInKitchen: string
  isOnLeave: boolean
  leaveDetails?: any
}

interface Statistics {
  totalActive: number
  foodPreferences: {
    eggs: number
    paneer: number
  }
  leave: {
    currentlyOnLeave: number
    leaveStudentIds: string[]
  }
  kitchenEligibility: {
    totalEligible: number
    availableForKitchen: number
    eligibleOnLeave: number
    teamMembers: number
    fcCount: number
  }
  eligibleFoodPreferences: {
    eggs: number
    paneer: number
  }
  roleBreakdown: {
    students: number
    teamMembers: number
    fc: number
  }
}

interface StudentDataResponse {
  statistics: Statistics
  students: Student[]
  currentLeaves: any[]
  lastUpdated: string
}

export default function StudentDataDashboard() {
  const [data, setData] = useState<StudentDataResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStudentData()
  }, [])

  const fetchStudentData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/students/data?includeStats=true&eligibleOnly=true')
      if (!response.ok) {
        throw new Error('Failed to fetch student data')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const refreshData = () => {
    fetchStudentData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading student data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-2">Error loading data</p>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <Button onClick={refreshData} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { statistics, students, currentLeaves } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Data Management</h1>
          <p className="text-muted-foreground">
            Comprehensive view of active students and kitchen eligibility
          </p>
        </div>
        <Button onClick={refreshData} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalActive}</div>
            <p className="text-xs text-muted-foreground">
              All active students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kitchen Eligible</CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.kitchenEligibility.totalEligible}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.kitchenEligibility.availableForKitchen} available for duty
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currently on Leave</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.leave.currentlyOnLeave}</div>
            <p className="text-xs text-muted-foreground">
              Excluded from kitchen duty
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.kitchenEligibility.teamMembers}</div>
            <p className="text-xs text-muted-foreground">
              Excluded from kitchen duty
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Food Preference Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Egg className="h-5 w-5" />
              Food Preferences (All Active)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Eggs</span>
                <span className="text-sm text-muted-foreground">
                  {statistics.foodPreferences.eggs} students
                </span>
              </div>
              <Progress 
                value={(statistics.foodPreferences.eggs / statistics.totalActive) * 100} 
                className="h-2"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Paneer</span>
                <span className="text-sm text-muted-foreground">
                  {statistics.foodPreferences.paneer} students
                </span>
              </div>
              <Progress 
                value={(statistics.foodPreferences.paneer / statistics.totalActive) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Kitchen Eligible Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Eggs</span>
                <span className="text-sm text-muted-foreground">
                  {statistics.eligibleFoodPreferences.eggs} students
                </span>
              </div>
              <Progress 
                value={(statistics.eligibleFoodPreferences.eggs / statistics.kitchenEligibility.totalEligible) * 100} 
                className="h-2"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Paneer</span>
                <span className="text-sm text-muted-foreground">
                  {statistics.eligibleFoodPreferences.paneer} students
                </span>
              </div>
              <Progress 
                value={(statistics.eligibleFoodPreferences.paneer / statistics.kitchenEligibility.totalEligible) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Table (Active + Kitchen Eligible)</CardTitle>
          <CardDescription>
            Last updated: {new Date(data.lastUpdated).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Works</TableHead>
                  <TableHead>Eats</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Kitchen Turns</TableHead>
                  <TableHead>Leave Days</TableHead>
                  <TableHead>Leave Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {student.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        {student.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.worksInKitchen === 'Kitchen' ? 'default' : 'secondary'}>
                        {student.worksInKitchen}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {student.foodPreference === 'EGGS' ? (
                          <Egg className="h-4 w-4" />
                        ) : (
                          <Coffee className="h-4 w-4" />
                        )}
                        {student.foodPreference}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        {student.totalKitchenTurns}
                      </div>
                    </TableCell>
                    <TableCell>{student.leaveDays}</TableCell>
                    <TableCell>
                      {student.isOnLeave ? (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <XCircle className="h-3 w-3" />
                          On Leave
                        </Badge>
                      ) : (
                        <Badge variant="default" className="flex items-center gap-1 w-fit">
                          <CheckCircle className="h-3 w-3" />
                          Available
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Current Leave Details */}
      {currentLeaves.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Leave Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentLeaves.map((leave, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{leave.reason}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}