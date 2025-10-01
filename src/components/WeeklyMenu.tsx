'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar, ChefHat, Users, Edit, Clock, CheckCircle, Circle, History, CalendarDays, Plus } from 'lucide-react'
import AddKitchenHistory from './AddKitchenHistory'

interface WeeklyMenuProps {
  className?: string
  students?: any[]
}

interface DayMenu {
  date: string
  dayName: string
  dayStatus: 'past' | 'today' | 'future'
  team?: {
    teamName?: string
    leader: string
    members: string[]
    isCompleted: boolean
    isHistorical?: boolean
    historyId?: string
  }
  menu: {
    breakfast: string
    lunch: string
    snacks: string
    dinner: string
    isOverride: boolean
    reason?: string
  }
  foodPreference: string
}

export default function WeeklyMenu({ className, students = [] }: WeeklyMenuProps) {
  const [weeklyMenu, setWeeklyMenu] = useState<DayMenu[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<DayMenu | null>(null)

  useEffect(() => {
    fetchWeeklyMenu()
  }, [])

  const fetchWeeklyMenu = async () => {
    try {
      const response = await fetch('/api/menu')
      if (response.ok) {
        const data = await response.json()
        setWeeklyMenu(data)
      }
    } catch (error) {
      console.error('Error fetching weekly menu:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getFoodPreferenceBadge = (preference: string) => {
    return (
      <Badge variant={preference === 'PANEER' ? 'default' : 'outline'}>
        {preference === 'PANEER' ? 'Paneer 🧀' : 'Egg 🥚'}
      </Badge>
    )
  }

  const getDayStatusBadge = (status: string) => {
    switch (status) {
      case 'past':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-700"><History className="h-3 w-3 mr-1" />Past</Badge>
      case 'today':
        return <Badge variant="default" className="bg-blue-100 text-blue-800"><CalendarDays className="h-3 w-3 mr-1" />Today</Badge>
      case 'future':
        return <Badge variant="outline" className="border-green-500 text-green-700"><Circle className="h-3 w-3 mr-1" />Upcoming</Badge>
      default:
        return null
    }
  }

  const getDayBorderClass = (status: string) => {
    switch (status) {
      case 'past':
        return 'border-gray-300 bg-gray-50'
      case 'today':
        return 'border-blue-500 bg-blue-50'
      case 'future':
        return 'border-green-300 bg-green-50'
      default:
        return 'border-gray-200'
    }
  }

  const getCompletionStatus = (isCompleted: boolean, dayStatus: string) => {
    if (dayStatus === 'future') return null
    return isCompleted ? (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Completed
      </Badge>
    ) : (
      <Badge variant="destructive">
        <Circle className="h-3 w-3 mr-1" />
        Not Completed
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Menu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Kitchen Duty Timeline
          </CardTitle>
          <div className="flex gap-2">
            <AddKitchenHistory 
              onHistoryAdded={fetchWeeklyMenu} 
              students={students}
            />
            <Button variant="outline" size="sm" onClick={fetchWeeklyMenu}>
              <Clock className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        <CardDescription>
          Past, present, and future kitchen duties with assigned teams
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Section */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border">
          <h3 className="font-semibold mb-3 text-gray-800">Kitchen Duty Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-gray-600" />
              <span className="font-medium">Past Duties:</span>
              <span className="text-gray-600">
                {weeklyMenu.filter(d => d.dayStatus === 'past' && d.team).length} days
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Today:</span>
              <span className="text-blue-600">
                {weeklyMenu.find(d => d.dayStatus === 'today')?.team ? 
                  `${weeklyMenu.find(d => d.dayStatus === 'today')?.team.leader}'s team` : 
                  'No team assigned'
                }
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="h-4 w-4 text-green-600" />
              <span className="font-medium">Upcoming:</span>
              <span className="text-green-600">
                {weeklyMenu.filter(d => d.dayStatus === 'future' && d.team).length} days
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {weeklyMenu.map((day, index) => {
            return (
              <div 
                key={day.date} 
                className={`p-4 border rounded-lg ${getDayBorderClass(day.dayStatus)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      {day.dayName}
                      {getDayStatusBadge(day.dayStatus)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {new Date(day.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getFoodPreferenceBadge(day.foodPreference)}
                    {day.menu.isOverride && (
                      <Badge variant="secondary">Custom Menu</Badge>
                    )}
                    {day.team && getCompletionStatus(day.team.isCompleted, day.dayStatus)}
                  </div>
                </div>

                {day.team && (
                  <div className="mb-3 p-2 bg-gray-50 rounded">
                    <p className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Kitchen Team
                      {day.team.isHistorical && (
                        <Badge variant="outline" className="text-xs">
                          <History className="h-2 w-2 mr-1" />
                          Historical
                        </Badge>
                      )}
                      {day.dayStatus === 'past' && day.team.isCompleted && (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      )}
                      {day.dayStatus === 'past' && !day.team.isCompleted && (
                        <Circle className="h-3 w-3 text-red-600" />
                      )}
                    </p>
                    <div className="text-sm">
                      {day.team.teamName && (
                        <div className="font-medium text-blue-600 mb-1">{day.team.teamName}</div>
                      )}
                      <span className="font-medium">{day.team.leader}</span> (Leader)
                      {day.team.members.length > 0 && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{day.team.members.join(', ')}</span>
                        </>
                      )}
                    </div>
                    {day.team.isHistorical && day.team.historyId && (
                      <div className="mt-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <p className="font-medium text-gray-700">🌅 Breakfast</p>
                    <p className="text-gray-600">{day.menu.breakfast}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">🍽️ Lunch</p>
                    <p className="text-gray-600">{day.menu.lunch}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">🍿 Snacks</p>
                    <p className="text-gray-600">{day.menu.snacks}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">🌙 Dinner</p>
                    <p className="text-gray-600">{day.menu.dinner}</p>
                  </div>
                </div>

                {day.menu.isOverride && day.menu.reason && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-xs text-yellow-800">
                      <strong>Note:</strong> {day.menu.reason}
                    </p>
                  </div>
                )}

                <div className="mt-3 flex justify-end">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedDay(day)}
                      >
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {day.dayName} - {new Date(day.date).toLocaleDateString()}
                        </DialogTitle>
                        <DialogDescription>
                          Detailed menu and kitchen team information
                        </DialogDescription>
                      </DialogHeader>
                      {selectedDay && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <span className="font-medium">Day Status:</span>
                            <div className="flex items-center gap-2">
                              {getDayStatusBadge(selectedDay.dayStatus)}
                              {selectedDay.team && getCompletionStatus(selectedDay.team.isCompleted, selectedDay.dayStatus)}
                            </div>
                          </div>
                          {selectedDay.team && (
                            <div>
                              <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Kitchen Team
                              </h4>
                              <div className="p-3 bg-gray-50 rounded">
                                <p className="font-medium">{selectedDay.team.leader} (Team Leader)</p>
                                {selectedDay.team.members.length > 0 && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    Members: {selectedDay.team.members.join(', ')}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <ChefHat className="h-4 w-4" />
                              Menu Details
                            </h4>
                            <div className="space-y-2">
                              <div className="p-3 border rounded">
                                <p className="font-medium">🌅 Breakfast</p>
                                <p className="text-gray-700">{selectedDay.menu.breakfast}</p>
                              </div>
                              <div className="p-3 border rounded">
                                <p className="font-medium">🍽️ Lunch</p>
                                <p className="text-gray-700">{selectedDay.menu.lunch}</p>
                              </div>
                              <div className="p-3 border rounded">
                                <p className="font-medium">🍿 Snacks</p>
                                <p className="text-gray-700">{selectedDay.menu.snacks}</p>
                              </div>
                              <div className="p-3 border rounded">
                                <p className="font-medium">🌙 Dinner</p>
                                <p className="text-gray-700">{selectedDay.menu.dinner}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Food Type:</span>
                              {getFoodPreferenceBadge(selectedDay.foodPreference)}
                            </div>
                            {selectedDay.menu.isOverride && (
                              <Badge variant="secondary">Custom Menu</Badge>
                            )}
                          </div>

                          {selectedDay.menu.isOverride && selectedDay.menu.reason && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                              <p className="text-sm font-medium text-yellow-800">Special Note:</p>
                              <p className="text-sm text-yellow-700">{selectedDay.menu.reason}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}