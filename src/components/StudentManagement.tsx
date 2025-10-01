'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, Search, Filter, UserPlus, MoreHorizontal } from 'lucide-react'
import EditStudentProfile from './EditStudentProfile'
import { FoodType, Status, WorkType } from '@prisma/client'

interface Student {
  id: string
  name: string
  email: string
  discordId?: string
  foodPreference: FoodType
  workType: WorkType
  status: Status
  joinedAt: string
  leaveStartAt?: string
  leaveEndAt?: string
  fcStartAt?: string
  fcEndAt?: string
  totalDuties: number
  lastDutyDate?: string
  nextAvailableDate?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface StudentManagementProps {
  currentUser: { id: string; name: string; email: string }
}

export default function StudentManagement({ currentUser }: StudentManagementProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [workTypeFilter, setWorkTypeFilter] = useState<string>('all')

  useEffect(() => {
    fetchStudents()
  }, [])

  useEffect(() => {
    filterStudents()
  }, [students, searchTerm, statusFilter, workTypeFilter])

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students')
      if (response.ok) {
        const data = await response.json()
        setStudents(data)
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterStudents = () => {
    let filtered = students

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(student => student.status === statusFilter)
    }

    // Filter by work type
    if (workTypeFilter !== 'all') {
      filtered = filtered.filter(student => student.workType === workTypeFilter)
    }

    setFilteredStudents(filtered)
  }

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'LEAVE': return 'bg-yellow-100 text-yellow-800'
      case 'PLACED': return 'bg-blue-100 text-blue-800'
      case 'INACTIVE': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getWorkTypeColor = (workType: WorkType) => {
    switch (workType) {
      case 'KITCHEN': return 'bg-orange-100 text-orange-800'
      case 'TEAM': return 'bg-purple-100 text-purple-800'
      case 'NONE': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Student Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading students...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Student Management
        </CardTitle>
        <CardDescription>
          Manage student profiles, status, and work assignments
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="LEAVE">On Leave</SelectItem>
              <SelectItem value="PLACED">Placed</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={workTypeFilter} onValueChange={setWorkTypeFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Filter by work type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="KITCHEN">Kitchen</SelectItem>
              <SelectItem value="TEAM">Team</SelectItem>
              <SelectItem value="NONE">None</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Students Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Work Type</TableHead>
                <TableHead>Food Preference</TableHead>
                <TableHead>Total Duties</TableHead>
                <TableHead>Last Duty</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-center">
                      <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {searchTerm || statusFilter !== 'all' || workTypeFilter !== 'all'
                          ? 'No students found matching your filters'
                          : 'No students found'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-muted-foreground">{student.email}</div>
                        {student.discordId && (
                          <div className="text-xs text-muted-foreground">Discord: {student.discordId}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(student.status)}>
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getWorkTypeColor(student.workType)}>
                        {student.workType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {student.foodPreference}
                      </Badge>
                    </TableCell>
                    <TableCell>{student.totalDuties}</TableCell>
                    <TableCell>
                      {student.lastDutyDate ? formatDate(student.lastDutyDate) : 'Never'}
                    </TableCell>
                    <TableCell>{formatDate(student.joinedAt)}</TableCell>
                    <TableCell className="text-right">
                      <EditStudentProfile
                        student={student}
                        onProfileUpdated={fetchStudents}
                        currentUser={currentUser}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {students.filter(s => s.status === 'ACTIVE').length}
            </div>
            <div className="text-sm text-muted-foreground">Active Students</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {students.filter(s => s.status === 'LEAVE').length}
            </div>
            <div className="text-sm text-muted-foreground">On Leave</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {students.filter(s => s.workType === 'KITCHEN').length}
            </div>
            <div className="text-sm text-muted-foreground">Kitchen Team</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {students.filter(s => s.workType === 'TEAM').length}
            </div>
            <div className="text-sm text-muted-foreground">Regular Team</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}