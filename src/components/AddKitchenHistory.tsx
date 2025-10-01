'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Save, X, History } from 'lucide-react'

interface AddKitchenHistoryProps {
  onHistoryAdded: () => void
  students: any[]
}

export default function AddKitchenHistory({ onHistoryAdded, students }: AddKitchenHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    date: '',
    teamName: '',
    teamLeaderId: '',
    teamLeaderName: '',
    member2Id: '',
    member2Name: '',
    member3Id: '',
    member3Name: '',
    member4Id: '',
    member4Name: '',
    breakfast: '',
    lunch: '',
    snacks: '',
    dinner: '',
    foodPreference: 'PANEER',
    isCompleted: false,
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/kitchen-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setIsOpen(false)
        resetForm()
        onHistoryAdded()
        alert('Kitchen history added successfully!')
      } else {
        const error = await response.json()
        alert(`Failed to add kitchen history: ${error.error}`)
      }
    } catch (error) {
      console.error('Error adding kitchen history:', error)
      alert('Error adding kitchen history')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      date: '',
      teamName: '',
      teamLeaderId: '',
      teamLeaderName: '',
      member2Id: '',
      member2Name: '',
      member3Id: '',
      member3Name: '',
      member4Id: '',
      member4Name: '',
      breakfast: '',
      lunch: '',
      snacks: '',
      dinner: '',
      foodPreference: 'PANEER',
      isCompleted: false,
      notes: ''
    })
  }

  const handleStudentSelect = (field: string, studentId: string) => {
    if (studentId === 'none') {
      // Handle the "None" selection
      setFormData(prev => ({
        ...prev,
        [`${field}Id`]: '',
        [`${field}Name`]: ''
      }))
      return
    }
    
    const student = students.find(s => s.id === studentId)
    if (student) {
      setFormData(prev => ({
        ...prev,
        [`${field}Id`]: studentId,
        [`${field}Name`]: student.name
      }))
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Kitchen History
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Add Kitchen History
          </DialogTitle>
          <DialogDescription>
            Add historical kitchen duty information for past days
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Date Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date *
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="col-span-3"
                required
                max={new Date().toISOString().split('T')[0]} // Can't be future date
              />
            </div>

            {/* Team Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="teamName" className="text-right">
                Team Name *
              </Label>
              <Input
                id="teamName"
                type="text"
                value={formData.teamName}
                onChange={(e) => handleInputChange('teamName', e.target.value)}
                className="col-span-3"
                placeholder="e.g., Alpha Team, Kitchen Warriors"
                required
              />
            </div>

            {/* Team Selection */}
            <div className="col-span-4">
              <Label className="text-sm font-medium mb-2 block">Kitchen Team</Label>
              
              {/* Team Leader */}
              <div className="grid grid-cols-4 items-center gap-4 mb-2">
                <Label className="text-right text-sm">Leader *</Label>
                <Select
                  value={formData.teamLeaderId}
                  onValueChange={(value) => handleStudentSelect('teamLeader', value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select team leader" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Member 2 */}
              <div className="grid grid-cols-4 items-center gap-4 mb-2">
                <Label className="text-right text-sm">Member 2</Label>
                <Select
                  value={formData.member2Id || 'none'}
                  onValueChange={(value) => handleStudentSelect('member2', value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select member (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Member 3 */}
              <div className="grid grid-cols-4 items-center gap-4 mb-2">
                <Label className="text-right text-sm">Member 3</Label>
                <Select
                  value={formData.member3Id || 'none'}
                  onValueChange={(value) => handleStudentSelect('member3', value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select member (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Member 4 */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-sm">Member 4</Label>
                <Select
                  value={formData.member4Id || 'none'}
                  onValueChange={(value) => handleStudentSelect('member4', value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select member (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Food Preference */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="foodPreference" className="text-right">
                Food Preference
              </Label>
              <Select
                value={formData.foodPreference}
                onValueChange={(value) => handleInputChange('foodPreference', value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PANEER">Paneer 🧀</SelectItem>
                  <SelectItem value="EGG">Egg 🥚</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Menu Items */}
            <div className="col-span-4">
              <Label className="text-sm font-medium mb-2 block">Menu Items</Label>
              
              <div className="grid grid-cols-4 items-center gap-4 mb-2">
                <Label htmlFor="breakfast" className="text-right text-sm">Breakfast</Label>
                <Input
                  id="breakfast"
                  value={formData.breakfast}
                  onChange={(e) => handleInputChange('breakfast', e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., Poha with Sev"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4 mb-2">
                <Label htmlFor="lunch" className="text-right text-sm">Lunch</Label>
                <Input
                  id="lunch"
                  value={formData.lunch}
                  onChange={(e) => handleInputChange('lunch', e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., Dal Makhani + Rice + Roti"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4 mb-2">
                <Label htmlFor="snacks" className="text-right text-sm">Snacks</Label>
                <Input
                  id="snacks"
                  value={formData.snacks}
                  onChange={(e) => handleInputChange('snacks', e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., Samosa + Chai"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dinner" className="text-right text-sm">Dinner</Label>
                <Input
                  id="dinner"
                  value={formData.dinner}
                  onChange={(e) => handleInputChange('dinner', e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., Mixed Veg + Paratha"
                />
              </div>
            </div>

            {/* Completion Status */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isCompleted" className="text-right">
                Completed
              </Label>
              <Select
                value={formData.isCompleted.toString()}
                onValueChange={(value) => handleInputChange('isCompleted', value === 'true')}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes ✅</SelectItem>
                  <SelectItem value="false">No ⭕</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="notes" className="text-right pt-2">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="col-span-3"
                placeholder="Any additional notes about this day (optional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save History
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}