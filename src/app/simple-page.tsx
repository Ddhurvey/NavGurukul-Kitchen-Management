'use client'

import { useAuth } from '@/contexts/AuthContext'
import AuthPage from '@/components/AuthPage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChefHat, Users, Calendar } from 'lucide-react'

export default function SimpleDashboard() {
  const { user, isLoading } = useAuth()

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Show auth page if user is not logged in
  if (!user) {
    return <AuthPage />
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            NavGurukul Kitchen Management
          </h1>
          <p className="text-gray-600">
            Welcome back, {user.name}! ({user.role})
          </p>
        </div>

        {/* Simple Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Today's Duty
              </CardTitle>
              <CardDescription>
                Kitchen duty assignments for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Check today's kitchen team and menu
              </p>
              <Button className="w-full mt-4">View Details</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Students
              </CardTitle>
              <CardDescription>
                Student management and profiles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Manage student accounts and preferences
              </p>
              <Button className="w-full mt-4">Manage Students</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule
              </CardTitle>
              <CardDescription>
                Duty calendar and assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                View and manage kitchen duty schedule
              </p>
              <Button className="w-full mt-4">View Schedule</Button>
            </CardContent>
          </Card>
        </div>

        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Name</p>
                <p className="text-sm">{user.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Email</p>
                <p className="text-sm">{user.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Role</p>
                <p className="text-sm">{user.role}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Work Type</p>
                <p className="text-sm">{user.workType}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Status</p>
                <p className="text-sm">{user.status}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Food Preference</p>
                <p className="text-sm">{user.foodPreference || 'Not set'}</p>
              </div>
            </div>
            <div className="mt-4">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}