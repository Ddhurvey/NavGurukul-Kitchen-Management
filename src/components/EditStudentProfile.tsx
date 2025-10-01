'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, Edit, AlertCircle } from 'lucide-react'
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

interface EditStudentProfileProps {
  student: Student
  onProfileUpdated: () => void
  currentUser: { id: string; name: string; email: string }
}

export default function EditStudentProfile({ student, onProfileUpdated, currentUser }: EditStudentProfileProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: student.name,
    email: student.email,
    discordId: student.discordId || '',
    foodPreference: student.foodPreference,
    workType: student.workType,
    status: student.status,
    leaveStartAt: student.leaveStartAt ? new Date(student.leaveStartAt).toISOString().split('T')[0] : '',
    leaveEndAt: student.leaveEndAt ? new Date(student.leaveEndAt).toISOString().split('T')[0] : '',
    fcStartAt: student.fcStartAt ? new Date(student.fcStartAt).toISOString().split('T')[0] : '',
    fcEndAt: student.fcEndAt ? new Date(student.fcEndAt).toISOString().split('T')[0] : '',
    nextAvailableDate: student.nextAvailableDate ? new Date(student.nextAvailableDate).toISOString().split('T')[0] : '',
    statusReason: ''
  })

  const [showStatusReason, setShowStatusReason] = useState(false)

  useEffect(() => {
    if (formData.status !== student.status) {
      setShowStatusReason(true)
    } else {
      setShowStatusReason(false)
      setFormData(prev => ({ ...prev, statusReason: '' }))
    }
  }, [formData.status, student.status])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Validation
    if (showStatusReason && (!formData.statusReason || formData.statusReason.trim().length < 10)) {
      alert('Please provide a detailed reason (at least 10 characters) for the status change.')
      setIsLoading(false)
      return
    }

    // Additional validation for leave status
    if (formData.status === 'LEAVE') {
      if (!formData.leaveStartAt || !formData.leaveEndAt) {
        alert('Leave start and end dates are required when setting status to LEAVE.')
        setIsLoading(false)
        return
      }

      const startDate = new Date(formData.leaveStartAt)
      const endDate = new Date(formData.leaveEndAt)
      
      if (startDate >= endDate) {
        alert('Leave end date must be after start date.')
        setIsLoading(false)
        return
      }

      if (startDate < new Date().setHours(0,0,0,0)) {
        alert('Leave start date cannot be in the past.')
        setIsLoading(false)
        return
      }
    }

    try {
      const response = await fetch(`/api/students/${student.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          changedBy: currentUser.id,
          statusReason: formData.status !== student.status ? formData.statusReason : undefined
        }),
      })

      if (response.ok) {
        setIsOpen(false)
        onProfileUpdated()
        alert('Student profile updated successfully!')
      } else {
        const error = await response.json()
        alert(`Failed to update student profile: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating student profile:', error)
      alert('Error updating student profile')
    } finally {
      setIsLoading(false)
    }
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit Student Profile
          </DialogTitle>
          <DialogDescription>
            Update student information and status. All changes will be logged.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Status Display */}
          <div className="flex gap-2 p-3 bg-gray-50 rounded-lg">
            <Badge className={getStatusColor(student.status)}>
              {student.status}
            </Badge>
            <Badge className={getWorkTypeColor(student.workType)}>
              {student.workType}
            </Badge>
            <Badge variant="outline">
              {student.foodPreference}
            </Badge>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="discordId">Discord ID</Label>
              <Input
                id="discordId"
                value={formData.discordId}
                onChange={(e) => handleInputChange('discordId', e.target.value)}
                placeholder="Optional Discord username"
              />
            </div>
          </div>

          {/* Work and Food Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Preferences</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="workType">Work Type</Label>
                <Select
                  value={formData.workType}
                  onValueChange={(value) => handleInputChange('workType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KITCHEN">Kitchen</SelectItem>
                    <SelectItem value="TEAM">Team</SelectItem>
                    <SelectItem value="NONE">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="foodPreference">Food Preference</Label>
                <Select
                  value={formData.foodPreference}
                  onValueChange={(value) => handleInputChange('foodPreference', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PANEER">Paneer</SelectItem>
                    <SelectItem value="EGG">Egg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Status Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Status Management</h3>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="LEAVE">On Leave</SelectItem>
                  <SelectItem value="PLACED">Placed</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Reason - Only show when status is changed */}
            {showStatusReason && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Required:</strong> Please provide a detailed reason (minimum 10 characters) for changing the status from {student.status} to {formData.status}
                </AlertDescription>
              </Alert>
            )}
            
            {showStatusReason && (
              <div>
                <Label htmlFor="statusReason">Status Change Reason *</Label>
                <Textarea
                  id="statusReason"
                  value={formData.statusReason}
                  onChange={(e) => handleInputChange('statusReason', e.target.value)}
                  placeholder="Explain in detail why this status change is necessary (e.g., 'Going on family vacation from Oct 15-20, will be back on Oct 21')..."
                  required
                  rows={3}
                  className="border-red-200 focus:border-red-400"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 10 characters required. This will be logged for audit purposes.
                </p>
              </div>
            )}

            {/* Date Fields based on status */}
            {formData.status === 'LEAVE' && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>Leave Requirements:</strong> Both start and end dates are required for leave status. Start date cannot be in the past.
                </AlertDescription>
              </Alert>
            )}

            {(formData.status === 'LEAVE' || student.status === 'LEAVE') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="leaveStartAt">
                    Leave Start Date {formData.status === 'LEAVE' && '*'}
                  </Label>
                  <Input
                    id="leaveStartAt"
                    type="date"
                    value={formData.leaveStartAt}
                    onChange={(e) => handleInputChange('leaveStartAt', e.target.value)}
                    required={formData.status === 'LEAVE'}
                    className={formData.status === 'LEAVE' ? 'border-orange-200 focus:border-orange-400' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="leaveEndAt">
                    Leave End Date {formData.status === 'LEAVE' && '*'}
                  </Label>
                  <Input
                    id="leaveEndAt"
                    type="date"
                    value={formData.leaveEndAt}
                    onChange={(e) => handleInputChange('leaveEndAt', e.target.value)}
                    required={formData.status === 'LEAVE'}
                    className={formData.status === 'LEAVE' ? 'border-orange-200 focus:border-orange-400' : ''}
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="nextAvailableDate">Next Available Date</Label>
              <Input
                id="nextAvailableDate"
                type="date"
                value={formData.nextAvailableDate}
                onChange={(e) => handleInputChange('nextAvailableDate', e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading || 
                (showStatusReason && (!formData.statusReason || formData.statusReason.trim().length < 10)) ||
                (formData.status === 'LEAVE' && (!formData.leaveStartAt || !formData.leaveEndAt))
              }
            >
              {isLoading ? 'Updating...' : 'Update Profile'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}