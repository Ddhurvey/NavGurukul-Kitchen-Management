'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  ChefHat, 
  Egg, 
  Coffee,
  History,
  Edit,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  UserCheck,
  UserX,
  Users
} from 'lucide-react'
import { format } from 'date-fns'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  status: string
  foodPreference: string
  totalKitchenTurns: number
  leaveDays: number
  rotationPosition: number
  lastTurnDate?: string
  createdAt: string
  updatedAt: string
}

interface KitchenHistory {
  id: string
  kitchenTurn: {
    id: string
    date: string
    status: string
    teamLeaderId?: string
  }
}

interface LeaveHistory {
  id: string
  reason: string
  startDate: string
  endDate: string
  status: string
  isEmergency: boolean
  createdAt: string
}

interface RoleHistory {
  id: string
  role: string
  startDate: string
  endDate?: string
}

interface ProfileData {
  user: UserProfile
  kitchenHistory: KitchenHistory[]
  leaveHistory: LeaveHistory[]
  roleHistory: RoleHistory[]
  currentLeave?: any
  canEdit: boolean
  statistics: {
    totalKitchenTurns: number
    totalLeaveDays: number
    upcomingDuties: number
    completedDuties: number
  }
}

interface ProfileManagementProps {
  userId: string
}

export default function ProfileManagement({ userId }: ProfileManagementProps) {
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [formData, setFormData] = useState<any>({})
  const [saveLoading, setSaveLoading] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [showSwapDialog, setShowSwapDialog] = useState(false)
  const [selectedKitchenTurnId, setSelectedKitchenTurnId] = useState<string | null>(null)
  const [availableStudents, setAvailableStudents] = useState<any[]>([])
  const [leaveForm, setLeaveForm] = useState({
    reason: '',
    startDate: '',
    endDate: '',
    isEmergency: false
  })
  const [swapForm, setSwapForm] = useState({
    toStudentId: '',
    reason: '',
    swapReason: 'PERSONAL_WORK'
  })

  useEffect(() => {
    fetchProfileData()
  }, [userId])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/profile?userId=${userId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch profile data')
      }
      const result = await response.json()
      setProfileData(result)
      setFormData({
        name: result.user.name,
        email: result.user.email,
        contact: result.user.contact || ''
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async (section: string) => {
    try {
      setSaveLoading(true)
      
      let endpoint = `/api/profile?userId=${userId}&action=update_${section}`
      let body = {}

      switch (section) {
        case 'profile':
          body = {
            name: formData.name,
            email: formData.email,
            contact: formData.contact
          }
          break
        case 'food_preference':
          body = {
            foodPreference: formData.foodPreference
          }
          break
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const result = await response.json()
      await fetchProfileData()
      setEditingSection(null)
      
      // Show success message
      alert(result.message)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleLeaveRequest = async () => {
    try {
      setSaveLoading(true)

      const response = await fetch(`/api/profile?userId=${userId}&action=request_leave`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(leaveForm)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit leave request')
      }

      const result = await response.json()
      await fetchProfileData()
      setShowLeaveDialog(false)
      setLeaveForm({ reason: '', startDate: '', endDate: '', isEmergency: false })
      
      alert(result.message)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit leave request')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleSwapRequest = async (kitchenTurnId: string) => {
    try {
      setSelectedKitchenTurnId(kitchenTurnId)
      
      // Fetch available students for swap
      const response = await fetch('/api/users')
      if (response.ok) {
        const users = await response.json()
        const activeStudents = users.filter((u: any) => 
          u.id !== userId && 
          u.role === 'STUDENT' && 
          u.status === 'ACTIVE'
        )
        setAvailableStudents(activeStudents)
      }
      
      setShowSwapDialog(true)
    } catch (err) {
      alert('Failed to load available students for swap')
    }
  }

  const handleSwapSubmit = async () => {
    try {
      setSaveLoading(true)

      const response = await fetch('/api/swap/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fromStudentId: userId,
          toStudentId: swapForm.toStudentId,
          kitchenTurnId: selectedKitchenTurnId,
          reason: swapForm.reason,
          swapReason: swapForm.swapReason
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit swap request')
      }

      const result = await response.json()
      await fetchProfileData()
      setShowSwapDialog(false)
      setSwapForm({ toStudentId: '', reason: '', swapReason: 'PERSONAL_WORK' })
      setSelectedKitchenTurnId(null)
      
      alert(result.message)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit swap request')
    } finally {
      setSaveLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-50 text-green-700 border-green-200'
      case 'ON_LEAVE': return 'bg-red-50 text-red-700 border-red-200'
      case 'PLACED': return 'bg-gray-50 text-gray-700 border-gray-200'
      default: return 'bg-blue-50 text-blue-700 border-blue-200'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'STUDENT': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'TEAM_MEMBER': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'FC': return 'bg-orange-50 text-orange-700 border-orange-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-2">Error loading profile</p>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <Button onClick={fetchProfileData} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!profileData) return null

  const { user, kitchenHistory, leaveHistory, roleHistory, currentLeave, canEdit, statistics } = profileData

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg font-bold">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{user.name}</h1>
                <p className="text-muted-foreground">{user.email}</p>
                <div className="flex gap-2 mt-2">
                  <Badge className={getStatusColor(user.status)}>
                    {user.status}
                  </Badge>
                  <Badge className={getRoleColor(user.role)}>
                    {user.role}
                  </Badge>
                  {currentLeave && (
                    <Badge variant="destructive">
                      On Leave
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {canEdit && (
              <Button
                onClick={() => setEditingSection(editingSection === 'profile' ? null : 'profile')}
                variant="outline"
              >
                {editingSection === 'profile' ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                {editingSection === 'profile' ? 'Cancel' : 'Edit Profile'}
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kitchen Turns</CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalKitchenTurns}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.completedDuties} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leave Days</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalLeaveDays}</div>
            <p className="text-xs text-muted-foreground">
              Total taken
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Duties</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.upcomingDuties}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Food Preference</CardTitle>
            {user.foodPreference === 'EGGS' ? <Egg className="h-4 w-4" /> : <Coffee className="h-4 w-4" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.foodPreference}</div>
            <p className="text-xs text-muted-foreground">
              Current preference
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="food">Food Preference</TabsTrigger>
          <TabsTrigger value="leave">Leave Management</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Personal Information */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingSection === 'profile' && canEdit ? (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contact">Contact (Optional)</Label>
                    <Input
                      id="contact"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleSaveProfile('profile')} disabled={saveLoading}>
                      {saveLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={() => setEditingSection(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                      <p className="font-medium">{user.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="font-medium">{user.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                      <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Member Since</Label>
                      <p className="font-medium">{format(new Date(user.createdAt), 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                      <p className="font-medium">{format(new Date(user.updatedAt), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                  {!canEdit && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Your profile is read-only because you are not an active student.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Food Preference */}
        <TabsContent value="food">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {user.foodPreference === 'EGGS' ? <Egg className="h-5 w-5" /> : <Coffee className="h-5 w-5" />}
                Food Preference
              </CardTitle>
              <CardDescription>
                Update your food preference for kitchen duty assignments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Egg className="h-5 w-5" />
                      <h3 className="font-medium">Eggs</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Preferred for dishes containing eggs</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Coffee className="h-5 w-5" />
                      <h3 className="font-medium">Paneer</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Preferred for vegetarian dishes with paneer</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Current Preference</p>
                    <p className="text-sm text-muted-foreground">This affects your kitchen duty assignments</p>
                  </div>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {user.foodPreference}
                  </Badge>
                </div>

                {canEdit && (
                  <div className="space-y-2">
                    <Label>Change Food Preference</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={formData.foodPreference === 'EGGS' ? 'default' : 'outline'}
                        onClick={() => setFormData({ ...formData, foodPreference: 'EGGS' })}
                      >
                        <Egg className="h-4 w-4 mr-2" />
                        Eggs
                      </Button>
                      <Button
                        variant={formData.foodPreference === 'PANEER' ? 'default' : 'outline'}
                        onClick={() => setFormData({ ...formData, foodPreference: 'PANEER' })}
                      >
                        <Coffee className="h-4 w-4 mr-2" />
                        Paneer
                      </Button>
                    </div>
                    {formData.foodPreference !== user.foodPreference && (
                      <div className="flex gap-2">
                        <Button onClick={() => handleSaveProfile('food_preference')} disabled={saveLoading}>
                          {saveLoading ? 'Saving...' : 'Update Preference'}
                        </Button>
                        <Button variant="outline" onClick={() => setFormData({ ...formData, foodPreference: user.foodPreference })}>
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Note: Changing your food preference will affect future kitchen duty assignments. 
                    For Sunday duties, at least one Egg-eater is required in the team.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave Management */}
        <TabsContent value="leave">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Leave Management
              </CardTitle>
              <CardDescription>
                Request leave and view your leave history
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentLeave ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You are currently on leave from {format(new Date(currentLeave.startDate), 'MMM dd, yyyy')} 
                    to {format(new Date(currentLeave.endDate), 'MMM dd, yyyy')}.
                  </AlertDescription>
                </Alert>
              ) : canEdit ? (
                <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                  <DialogTrigger asChild>
                    <Button>Request Leave</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Request Leave</DialogTitle>
                      <DialogDescription>
                        Submit a leave request with reason and dates
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="reason">Reason</Label>
                        <Textarea
                          id="reason"
                          placeholder="Enter reason for leave..."
                          value={leaveForm.reason}
                          onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={leaveForm.startDate}
                          onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="endDate">End Date</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={leaveForm.endDate}
                          onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="emergency"
                          checked={leaveForm.isEmergency}
                          onChange={(e) => setLeaveForm({ ...leaveForm, isEmergency: e.target.checked })}
                        />
                        <Label htmlFor="emergency">Emergency Leave</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleLeaveRequest} disabled={saveLoading}>
                          {saveLoading ? 'Submitting...' : 'Submit Request'}
                        </Button>
                        <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You cannot request leave because you are not an active student.
                  </AlertDescription>
                </Alert>
              )}

              {/* Leave History */}
              <div className="space-y-2">
                <h3 className="font-medium">Leave History</h3>
                {leaveHistory.length > 0 ? (
                  <div className="space-y-2">
                    {leaveHistory.map((leave) => (
                      <div key={leave.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{leave.reason}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(leave.startDate), 'MMM dd, yyyy')} - {format(new Date(leave.endDate), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {leave.isEmergency && (
                              <Badge variant="destructive">Emergency</Badge>
                            )}
                            <Badge variant={leave.status === 'APPROVED' ? 'default' : 'secondary'}>
                              {leave.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium mb-2">No leave history</p>
                    <p className="text-sm text-muted-foreground">
                      You haven't taken any leave yet. Use the button above to request leave if needed.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
          <div className="space-y-4">
            {/* Kitchen Duty History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  Kitchen Duty History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {kitchenHistory.length > 0 ? (
                  <div className="space-y-2">
                    {kitchenHistory.map((history) => {
                      const turnDate = new Date(history.kitchenTurn.date)
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      const isUpcoming = turnDate > today
                      const canSwap = isUpcoming && canEdit && history.kitchenTurn.status === 'PENDING'
                      
                      return (
                        <div key={history.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {format(new Date(history.kitchenTurn.date), 'EEEE, MMM dd, yyyy')}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Status: {history.kitchenTurn.status}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {history.kitchenTurn.teamLeaderId === user.id && (
                                <Badge variant="default">Team Leader</Badge>
                              )}
                              <Badge variant={history.kitchenTurn.status === 'DONE' ? 'default' : 'secondary'}>
                                {history.kitchenTurn.status}
                              </Badge>
                              {canSwap && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSwapRequest(history.kitchenTurn.id)}
                                >
                                  Request Swap
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium mb-2">No kitchen duties yet</p>
                    <p className="text-sm text-muted-foreground">
                      You haven't been assigned any kitchen duties yet. 
                      Duties are assigned based on rotation order and availability.
                    </p>
                    {user.status === 'ACTIVE' && (
                      <p className="text-sm text-muted-foreground mt-2">
                        You'll be automatically assigned when your turn comes up in the rotation.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Role History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Role History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {roleHistory.length > 0 ? (
                  <div className="space-y-2">
                    {roleHistory.map((role) => (
                      <div key={role.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{role.role}</p>
                            <p className="text-sm text-muted-foreground">
                              From: {format(new Date(role.startDate), 'MMM dd, yyyy')}
                            </p>
                            {role.endDate && (
                              <p className="text-sm text-muted-foreground">
                                To: {format(new Date(role.endDate), 'MMM dd, yyyy')}
                              </p>
                            )}
                          </div>
                          <Badge className={getRoleColor(role.role)}>
                            {role.role}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No role history found</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Swap Request Dialog */}
      <Dialog open={showSwapDialog} onOpenChange={setShowSwapDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Kitchen Duty Swap</DialogTitle>
            <DialogDescription>
              Request to swap your kitchen duty with another student
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="toStudentId">Select Student</Label>
              <Select
                value={swapForm.toStudentId}
                onValueChange={(value) => setSwapForm({ ...swapForm, toStudentId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student to swap with" />
                </SelectTrigger>
                <SelectContent>
                  {availableStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      <div className="flex items-center gap-2">
                        <span>{student.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {student.foodPreference}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="swapReason">Swap Reason</Label>
              <Select
                value={swapForm.swapReason}
                onValueChange={(value) => setSwapForm({ ...swapForm, swapReason: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason for swap" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HEALTH_ISSUE">Health Issue</SelectItem>
                  <SelectItem value="LEAVE">Going on Leave</SelectItem>
                  <SelectItem value="PERSONAL_WORK">Personal Work</SelectItem>
                  <SelectItem value="FAMILY_EMERGENCY">Family Emergency</SelectItem>
                  <SelectItem value="MEDICAL_APPOINTMENT">Medical Appointment</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="swapReasonText">Detailed Reason</Label>
              <Textarea
                id="swapReasonText"
                placeholder="Explain why you need to swap this duty..."
                value={swapForm.reason}
                onChange={(e) => setSwapForm({ ...swapForm, reason: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSwapSubmit} disabled={saveLoading || !swapForm.toStudentId || !swapForm.reason}>
                {saveLoading ? 'Submitting...' : 'Submit Swap Request'}
              </Button>
              <Button variant="outline" onClick={() => setShowSwapDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}