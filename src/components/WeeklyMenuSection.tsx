'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, Users, ChefHat, Utensils } from 'lucide-react'

interface KitchenHistory {
  id: string
  date: string
  teamName: string
  breakfast: string
  lunch: string
  dinner: string
  snacks?: string
  notes?: string
  isCompleted: boolean
}

export default function WeeklyMenuSection() {
  const [menus, setMenus] = useState<KitchenHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(0)

  const fetchWeeklyMenus = async (weekOffset: number = 0) => {
    setLoading(true)
    try {
      const today = new Date()
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7))
      startOfWeek.setHours(0, 0, 0, 0)

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      const response = await fetch(`/api/kitchen-history?startDate=${startOfWeek.toISOString()}&endDate=${endOfWeek.toISOString()}&limit=50`)
      if (response.ok) {
        const data = await response.json()
        // Sort by date ascending for weekly view
        setMenus(data.sort((a: KitchenHistory, b: KitchenHistory) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        ))
      }
    } catch (error) {
      console.error('Error fetching weekly menus:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeeklyMenus(currentWeek)
  }, [currentWeek])

  const getWeekRange = () => {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + (currentWeek * 7))
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    
    return {
      start: startOfWeek.toLocaleDateString(),
      end: endOfWeek.toLocaleDateString()
    }
  }

  const navigateWeek = (direction: number) => {
    setCurrentWeek(prev => prev + direction)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
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

  const weekRange = getWeekRange()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Weekly Menu
            </CardTitle>
            <CardDescription>
              {weekRange.start} - {weekRange.end}
              {currentWeek === 0 && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Current Week</span>}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek(-1)}
              disabled={currentWeek < -4}
            >
              ←
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek(1)}
              disabled={currentWeek > 4}
            >
              →
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {menus.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No menu planned for this week</p>
          </div>
        ) : (
          <div className="space-y-4">
            {menus.map((menu) => (
              <div key={menu.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-lg">
                        {new Date(menu.date).toLocaleDateString('en-US', { 
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    {menu.teamName && (
                      <Badge variant="default" className="bg-blue-100 text-blue-800">
                        <Users className="h-3 w-3 mr-1" />
                        {menu.teamName}
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <ChefHat className="h-3 w-3 mr-1" />
                    Kitchen Team
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">🌅</span>
                    <div>
                      <p className="font-medium text-sm">Breakfast</p>
                      <p className="text-sm text-gray-600">{menu.breakfast || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <span className="text-lg">🍽️</span>
                    <div>
                      <p className="font-medium text-sm">Lunch</p>
                      <p className="text-sm text-gray-600">{menu.lunch || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <span className="text-lg">🍿</span>
                    <div>
                      <p className="font-medium text-sm">Snacks</p>
                      <p className="text-sm text-gray-600">{menu.snacks || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <span className="text-lg">🌙</span>
                    <div>
                      <p className="font-medium text-sm">Dinner</p>
                      <p className="text-sm text-gray-600">{menu.dinner || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                {menu.notes && (
                  <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
                    <p className="text-sm font-medium text-amber-800">
                      📝 Note: {menu.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}