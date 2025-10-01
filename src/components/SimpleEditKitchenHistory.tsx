'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Edit, Save, X } from 'lucide-react'

interface SimpleEditKitchenHistoryProps {
  historyId: string
  currentData: {
    breakfast: string
    lunch: string
    snacks: string
    dinner: string
    notes?: string
  }
  onHistoryUpdated: () => void
}

export default function SimpleEditKitchenHistory({ 
  historyId, 
  currentData, 
  onHistoryUpdated 
}: SimpleEditKitchenHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    breakfast: currentData.breakfast || '',
    lunch: currentData.lunch || '',
    snacks: currentData.snacks || '',
    dinner: currentData.dinner || '',
    notes: currentData.notes || ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`/api/kitchen-history/${historyId}`, {
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit Menu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Kitchen Menu</DialogTitle>
          <DialogDescription>
            Update the menu items for this day
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="breakfast">Breakfast</Label>
            <Input
              id="breakfast"
              value={formData.breakfast}
              onChange={(e) => handleInputChange('breakfast', e.target.value)}
              placeholder="Enter breakfast menu"
            />
          </div>

          <div>
            <Label htmlFor="lunch">Lunch</Label>
            <Input
              id="lunch"
              value={formData.lunch}
              onChange={(e) => handleInputChange('lunch', e.target.value)}
              placeholder="Enter lunch menu"
            />
          </div>

          <div>
            <Label htmlFor="snacks">Snacks</Label>
            <Input
              id="snacks"
              value={formData.snacks}
              onChange={(e) => handleInputChange('snacks', e.target.value)}
              placeholder="Enter snacks menu"
            />
          </div>

          <div>
            <Label htmlFor="dinner">Dinner</Label>
            <Input
              id="dinner"
              value={formData.dinner}
              onChange={(e) => handleInputChange('dinner', e.target.value)}
              placeholder="Enter dinner menu"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>

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
              {isLoading ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}