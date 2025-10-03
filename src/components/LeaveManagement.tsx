'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, AlertCircle, CheckCircle, Clock, Plus } from 'lucide-react'

interface LeaveRequest {
  id: string
  date: string
  reason: string
  notes?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED'
  requestTime: string
  processedAt?: string
  replacementStudent?: {
    id: string
    name: string
    email: string
  }
  autoReplaced: boolean
}

interface LeaveManagementProps {
  leaveRequests: LeaveRequest[]
  onLeaveRequestCreated: () => void
}

export default function LeaveManagement({ leaveRequests, onLeaveRequestCreated }: LeaveManagementProps) {
  const [showLeaveForm, setShowLeaveForm] = useState(false)
  const [leaveForm, setLeaveForm] = useState({
    date: '',
    reason: 'HEALTH_ISSUE' as const,
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmitLeave = async () => {
    if (!leaveForm.date) {
      alert('Please select a date')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leaveForm)
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message)
        setLeaveForm({ date: '', reason: 'HEALTH_ISSUE', notes: '' })
        setShowLeaveForm(false)
        onLeaveRequestCreated()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to submit leave request')
      }
    } catch (error) {
      console.error('Error submitting leave request:', error)
      alert('Failed to submit leave request')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED': return 'bg-green-100 text-green-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      case 'PROCESSED': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-4 w-4" />
      case 'APPROVED': return <CheckCircle className="h-4 w-4" />
      case 'REJECTED': return <AlertCircle className="h-4 w-4" />
      case 'PROCESSED': return <CheckCircle className="h-4 w-4" />
      default: return null
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getMinDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Leave Management
          </CardTitle>
          <Button
            onClick={() => setShowLeaveForm(!showLeaveForm)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Apply for Leave
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showLeaveForm && (
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <h3 className="font-semibold mb-4">Apply for Leave</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={leaveForm.date}
                  onChange={(e) => setLeaveForm({...leaveForm, date: e.target.value})}
                  min={getMinDate()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <select
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="HEALTH_ISSUE">Health Issue</option>
                  <option value="PERSONAL_WORK">Personal Work</option>
                  <option value="FAMILY_EMERGENCY">Family Emergency</option>
                  <option value="MEDICAL_APPOINTMENT">Medical Appointment</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={leaveForm.notes}
                  onChange={(e) => setLeaveForm({...leaveForm, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional details about your leave..."
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSubmitLeave}
                  disabled={submitting}
                  className="flex items-center gap-2"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : null}
                  Submit Leave Request
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowLeaveForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {leaveRequests.map((leave) => (
            <div key={leave.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold">{formatDate(leave.date)}</h4>
                  <p className="text-sm text-gray-600">
                    Applied on: {formatDate(leave.requestTime)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(leave.status)}
                  <Badge className={getStatusColor(leave.status)}>
                    {leave.status}
                  </Badge>
                </div>
              </div>

              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700">Reason:</p>
                <p className="text-sm">{leave.reason.replace('_', ' ')}</p>
                {leave.notes && (
                  <p className="text-sm text-gray-600 mt-1">Notes: {leave.notes}</p>
                )}
              </div>

              {leave.replacementStudent && (
                <div className="text-sm text-gray-600 mb-2">
                  <p>Replacement: {leave.replacementStudent.name}</p>
                  {leave.autoReplaced && (
                    <p className="text-blue-600">
                      ✓ Auto-replaced before cutoff time (9 PM weekdays, 9 AM Saturday)
                    </p>
                  )}
                </div>
              )}

              {leave.processedAt && (
                <div className="text-sm text-gray-500">
                  Processed on: {formatDate(leave.processedAt)}
                </div>
              )}
            </div>
          ))}

          {leaveRequests.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No leave requests yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Click "Apply for Leave" to submit your first leave request
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}