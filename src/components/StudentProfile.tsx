'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { User, Calendar, ChefHat, Clock, CheckCircle, XCircle, ArrowRightLeft } from 'lucide-react'

interface StudentProfileProps {
  student: any
}

export default function StudentProfile({ student }: StudentProfileProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [detailedData, setDetailedData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [swapDialogOpen, setSwapDialogOpen] = useState(false)
  const [availableStudents, setAvailableStudents] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTarget, setSelectedTarget] = useState('')
  const [swapReason, setSwapReason] = useState('')
  const [isSubmittingSwap, setIsSubmittingSwap] = useState(false)

  const fetchDetailedData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/students/${student.id}`)
      if (response.ok) {
        const data = await response.json()
        setDetailedData(data)
      }
    } catch (error) {
      console.error('Error fetching student details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpen = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      fetchDetailedData()
    }
  }

  const fetchAvailableStudents = async () => {
    try {
      const response = await fetch('/api/students')
      if (response.ok) {
        const students = await response.json()
        const kitchenStudents = students.filter((s: any) => 
          s.workType === 'KITCHEN' && 
          s.status === 'ACTIVE' && 
          s.id !== student.id
        )
        setAvailableStudents(kitchenStudents)
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const openSwapDialog = () => {
    setSwapDialogOpen(true)
    fetchAvailableStudents()
  }

  const submitSwapRequest = async () => {
    if (!selectedDate || !selectedTarget || !swapReason.trim()) {
      alert('Please fill in all fields')
      return
    }

    setIsSubmittingSwap(true)
    try {
      const response = await fetch('/api/swaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requesterId: student.id,
          targetId: selectedTarget,
          dutyDate: selectedDate,
          reason: swapReason.trim()
        })
      })

      if (response.ok) {
        alert('Swap request sent successfully!')
        setSwapDialogOpen(false)
        setSelectedDate('')
        setSelectedTarget('')
        setSwapReason('')
        fetchDetailedData() // Refresh data
      } else {
        const error = await response.json()
        alert(`Failed to send swap request: ${error.error}`)
      }
    } catch (error) {
      alert('Error sending swap request')
    } finally {
      setIsSubmittingSwap(false)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'FC':
        return <Badge variant="default">Food Coordinator</Badge>
      case 'TEAM_MEMBER':
        return <Badge variant="secondary">Team Member</Badge>
      default:
        return <Badge variant="outline">Student</Badge>
    }
  }

  const getWorkTypeBadge = (workType: string) => {
    switch (workType) {
      case 'KITCHEN':
        return <Badge variant="default">Kitchen</Badge>
      case 'TEAM':
        return <Badge variant="secondary">Team</Badge>
      default:
        return <Badge variant="outline">None</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'LEAVE':
        return <Badge className="bg-yellow-100 text-yellow-800">On Leave</Badge>
      case 'PLACED':
        return <Badge className="bg-purple-100 text-purple-800">Placed</Badge>
      default:
        return <Badge variant="secondary">Inactive</Badge>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <User className="h-4 w-4 mr-2" />
          View Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={undefined} />
              <AvatarFallback>
                {student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div>{student.name}</div>
              <div className="text-sm font-normal text-gray-600">{student.email}</div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Student profile and kitchen duty history
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : detailedData ? (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Work Type</p>
                <div className="mt-1">{getWorkTypeBadge(detailedData.workType)}</div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Status</p>
                <div className="mt-1">{getStatusBadge(detailedData.status)}</div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Food Preference</p>
                <div className="mt-1">
                  <Badge variant="outline">
                    {detailedData.foodPreference === 'PANEER' ? 'Paneer 🧀' : 'Egg 🥚'}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Total Duties</p>
                <div className="mt-1">
                  <span className="text-lg font-semibold">{detailedData.totalDuties}</span>
                </div>
              </div>
            </div>

            {detailedData.discordId && (
              <div>
                <p className="text-sm font-medium text-gray-700">Discord ID</p>
                <p className="text-sm text-gray-600">{detailedData.discordId}</p>
              </div>
            )}

            {/* Swap Request Button */}
            {detailedData.workType === 'KITCHEN' && detailedData.status === 'ACTIVE' && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={openSwapDialog}
                  className="flex items-center gap-2"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Request Swap
                </Button>
              </div>
            )}

            {/* Kitchen Duty History */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Kitchen Duty History
              </h3>
              
              {/* Combine all history records */}
              {(() => {
                const allHistory = [
                  ...detailedData.historyDutiesAsLeader?.map(h => ({ ...h, role: 'Team Leader' })) || [],
                  ...detailedData.historyDutiesAsMember2?.map(h => ({ ...h, role: 'Team Member' })) || [],
                  ...detailedData.historyDutiesAsMember3?.map(h => ({ ...h, role: 'Team Member' })) || [],
                  ...detailedData.historyDutiesAsMember4?.map(h => ({ ...h, role: 'Team Member' })) || []
                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

                return allHistory.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>Menu</TableHead>
                          <TableHead>Role</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allHistory.map((history, index) => (
                          <TableRow key={`${history.id}-${index}`}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {new Date(history.date).toLocaleDateString()}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(history.date).toLocaleDateString('en-US', { weekday: 'long' })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {history.teamName ? (
                                <Badge variant="default" className="bg-blue-100 text-blue-800">
                                  {history.teamName}
                                </Badge>
                              ) : (
                                <Badge variant="outline">No Team</Badge>
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="space-y-1">
                                {history.breakfast && (
                                  <div className="text-xs">🌅 {history.breakfast}</div>
                                )}
                                {history.lunch && (
                                  <div className="text-xs">🍽️ {history.lunch}</div>
                                )}
                                {history.snacks && (
                                  <div className="text-xs">🍿 {history.snacks}</div>
                                )}
                                {history.dinner && (
                                  <div className="text-xs">🌙 {history.dinner}</div>
                                )}
                                {history.notes && (
                                  <div className="text-xs text-amber-600 font-medium">
                                    📝 {history.notes}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {history.role}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No kitchen duties assigned yet</p>
                  </div>
                )
              })()}
            </div>

            {/* Swap Requests */}
            {(detailedData.dutySwapsRequested?.length > 0 || detailedData.dutySwapsTargeted?.length > 0) && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Swap Requests
                </h3>
                
                {detailedData.dutySwapsRequested?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Requested Swaps:</p>
                    <div className="space-y-2">
                      {detailedData.dutySwapsRequested.map((swap: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div className="text-sm">
                            <span className="font-medium">With {swap.target.name}</span>
                            <span className="text-gray-600 ml-2">
                              for {new Date(swap.dutyDate).toLocaleDateString()}
                            </span>
                          </div>
                          <Badge variant={
                            swap.status === 'APPROVED' ? 'default' :
                            swap.status === 'REJECTED' ? 'destructive' : 'secondary'
                          }>
                            {swap.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detailedData.dutySwapsTargeted?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Targeted Swaps:</p>
                    <div className="space-y-2">
                      {detailedData.dutySwapsTargeted.map((swap: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div className="text-sm">
                            <span className="font-medium">From {swap.requester.name}</span>
                            <span className="text-gray-600 ml-2">
                              for {new Date(swap.dutyDate).toLocaleDateString()}
                            </span>
                          </div>
                          <Badge variant={
                            swap.status === 'APPROVED' ? 'default' :
                            swap.status === 'REJECTED' ? 'destructive' : 'secondary'
                          }>
                            {swap.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <User className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No detailed information available</p>
          </div>
        )}

        {/* Swap Request Dialog */}
        <Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Request Duty Swap
              </DialogTitle>
              <DialogDescription>
                Request to swap your kitchen duty with another student
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="duty-date">Select Duty Date</Label>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a duty date" />
                  </SelectTrigger>
                  <SelectContent>
                    {detailedData?.assignedDuties?.map((duty: any) => (
                      <SelectItem key={duty.id} value={duty.date}>
                        {new Date(duty.date).toLocaleDateString()} - {duty.role || 'Team Member'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="target-student">Select Student to Swap With</Label>
                <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.totalDuties} duties)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="swap-reason">Reason for Swap</Label>
                <Textarea
                  id="swap-reason"
                  placeholder="Please explain why you need to swap this duty..."
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setSwapDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={submitSwapRequest}
                  disabled={isSubmittingSwap || !selectedDate || !selectedTarget || !swapReason.trim()}
                  className="flex-1"
                >
                  {isSubmittingSwap ? 'Sending...' : 'Send Request'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}