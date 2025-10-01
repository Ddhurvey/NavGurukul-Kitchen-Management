'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChefHat, LogIn } from 'lucide-react'
import KitchenDutyDashboardClient from './KitchenDutyDashboardClient'
import { useAuth } from './auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface Props {
  initialStudents: any[]
  initialTodayDuty: any
  initialTomorrowDuty: any
  initialTodayMenu: any
}

export default function PageWrapper({
  initialStudents,
  initialTodayDuty,
  initialTomorrowDuty,
  initialTodayMenu
}: Props) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-6 text-center">
            <ChefHat className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please sign in to access the kitchen duty management system.</p>
            <Button onClick={() => router.push('/auth')} className="w-full">
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <KitchenDutyDashboardClient 
      initialStudents={initialStudents}
      initialTodayDuty={initialTodayDuty}
      initialTomorrowDuty={initialTomorrowDuty}
      initialTodayMenu={initialTodayMenu}
    />
  )
}