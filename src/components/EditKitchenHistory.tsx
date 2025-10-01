'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Edit, Save, X, Utensils, Calendar } from 'lucide-react'

interface KitchenHistory {
  id: string
  date: string
  teamName?: string
  teamLeaderId?: string
  member2Id?: string
  member3Id?: string
  member4Id?: string
  teamLeaderName?: string
  member2Name?: string
  member3Name?: string
  member4Name?: string
  breakfast?: string
  lunch?: string
  snacks?: string
  dinner?: string
  foodPreference?: string
  isCompleted: boolean
  notes?: string
  createdAt?: string
  updatedAt?: string
}

interface EditKitchenHistoryProps {
  history: KitchenHistory
  onHistoryUpdated: () => void
}

export default function EditKitchenHistory({ history, onHistoryUpdated }: EditKitchenHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    teamName: history.teamName || '',
    breakfast: history.breakfast || '',
    lunch: history.lunch || '',
    snacks: history.snacks || '',
    dinner: history.dinner || '',
    foodPreference: history.foodPreference || 'PANEER',
    isCompleted: history.isCompleted,
    notes: history.notes || ''
  })

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`/api/kitchen-history/${history.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setIsOpen(false)
        onHistoryUpdated()
        alert('Kitchen history updated successfully!')
      } else {
        const error = await response.json()
        alert(`Failed to update kitchen history: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating kitchen history:', error)
      alert('Error updating kitchen history')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit Menu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Edit Kitchen History Menu
          </DialogTitle>
          <DialogDescription>
            Update the menu and details for {formatDate(history.date)}
          </DialogDescription>
        </DialogHeader>

        {/* Original Information Display */}
        <Card className="bg-gray-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Original Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Team Name:</span> {history.teamName || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Team Leader:</span> {history.teamLeaderName || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Members:</span> {
                  [history.member2Name, history.member3Name, history.member4Name]
                    .filter(Boolean)
                    .join(', ') || 'N/A'
                }
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <Badge className={history.isCompleted ? 'bg-green-100 text-green-800 ml-2' : 'bg-yellow-100 text-yellow-800 ml-2'}>
                  {history.isCompleted ? 'Completed' : 'Not Completed'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Team Name */}
          <div>
            <Label htmlFor="teamName">Team Name</Label>
            <Input
              id="teamName"
              value={formData.teamName}
              onChange={(e) => handleInputChange('teamName', e.target.value)}
              placeholder="Enter team name"
            />
          </div>

          {/* Menu Items */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Menu Items</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="breakfast">🌅 Breakfast</Label>
                <Input
                  id="breakfast"
                  value={formData.breakfast}
                  onChange={(e) => handleInputChange('breakfast', e.target.value)}
                  placeholder="Enter breakfast menu"
                />
              </div>
              
              <div>
                <Label htmlFor="lunch">🍽️ Lunch</Label>
                <Input
                  id="lunch"
                  value={formData.lunch}
                  onChange={(e) => handleInputChange('lunch', e.target.value)}
                  placeholder="Enter lunch menu"
                />
              </div>
              
              <div>
                <Label htmlFor="snacks">🍿 Snacks</Label>
                <Input
                  id="snacks"
                  value={formData.snacks}
                  onChange={(e) => handleInputChange('snacks', e.target.value)}
                  placeholder="Enter snacks menu"
                />
              </div>
              
              <div>
                <Label htmlFor="dinner">🌙 Dinner</Label>
                <Input
                  id="dinner"
                  value={formData.dinner}
                  onChange={(e) => handleInputChange('dinner', e.target.value)}
                  placeholder="Enter dinner menu"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Additional Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isCompleted"
                  checked={formData.isCompleted}
                  onChange={(e) => handleInputChange('isCompleted', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isCompleted">Mark as Completed</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional notes about this day..."
                rows={3}
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
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Updating...' : 'Update Menu'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}