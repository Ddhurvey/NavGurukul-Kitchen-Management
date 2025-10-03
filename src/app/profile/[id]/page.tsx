'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChefHat, Calendar, Users, ArrowLeft, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  status: string
  foodPreference: string
  totalKitchenTurns: number
  leaveDays: number
  discordId?: string
  photoUrl?: string
  createdAt: string
  kitchenHistory: any[]
  leaveHistory: any[]
}

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [params.id])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!params.id) {
        setError('User ID is required')
        return
      }
      
      const response = await fetch(`/api/users/${params.id}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 404) {
          setError(errorData.error || 'User not found')
        } else if (response.status === 401) {
          setError('Authentication required. Please log in.')
        } else {
          setError(errorData.error || `Failed to fetch profile (${response.status})`)
        }
        return
      }

      const data = await response.json()
      if (!data.user) {
        setError('User data not found')
        return
      }
      
      setProfile(data.user)
    } catch (error) {
      console.error('Error fetching profile:', error)
      setError('Failed to fetch profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const canEditProfile = () => {
    return currentUser && (currentUser.id === params.id || ['ADMIN', 'FC', 'TEAM_MEMBER'].includes(currentUser.role))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">{error || 'Profile not found'}</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-bold text-gray-900">
                {profile.name}'s Profile
              </h1>
            </div>
            {canEditProfile() && (
              <Button
                onClick={() => router.push('/?section=profile')}
                variant="outline"
              >
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="space-y-6">
            {/* Profile Overview */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    {profile.photoUrl ? (
                      <img
                        src={profile.photoUrl}
                        alt={profile.name}
                        className="h-20 w-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
                        {profile.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
                    <p className="text-gray-600">{profile.email}</p>
                    {profile.discordId && (
                      <p className="text-sm text-gray-500">Discord ID: {profile.discordId}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {profile.role}
                      </Badge>
                      <Badge variant="outline" className={cn(
                        "border",
                        profile.status === 'ACTIVE' 
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-50 text-gray-700 border-gray-200"
                      )}>
                        {profile.status}
                      </Badge>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        {profile.foodPreference}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-600 text-sm font-medium">Kitchen Turns</p>
                      <p className="text-3xl font-bold text-orange-900 mt-1">{profile.totalKitchenTurns}</p>
                    </div>
                    <ChefHat className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 text-sm font-medium">Leave Days</p>
                      <p className="text-3xl font-bold text-green-900 mt-1">{profile.leaveDays}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-600 text-sm font-medium">Food Preference</p>
                      <p className="text-xl font-bold text-purple-900 mt-1">{profile.foodPreference}</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 text-sm font-medium">Member Since</p>
                      <p className="text-lg font-bold text-blue-900 mt-1">
                        {new Date(profile.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Kitchen History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  Kitchen History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {profile.kitchenHistory && profile.kitchenHistory.length > 0 ? (
                    profile.kitchenHistory.map((history: any, index: number) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              📅 {new Date(history.date).toLocaleDateString('en-US', { 
                                day: 'numeric', 
                                month: 'short', 
                                year: 'numeric' 
                              })}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              Kitchen Team ({history.teamMembers?.join(', ')})
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Menu: {history.menu?.join(', ') || 'Not recorded'}
                            </p>
                            {history.wasLeader && (
                              <Badge variant="outline" className="mt-2 bg-yellow-50 text-yellow-700 border-yellow-200">
                                Team Leader
                              </Badge>
                            )}
                          </div>
                          <Badge variant="outline" className={cn(
                            history.status === 'DONE' 
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-50 text-gray-700 border-gray-200"
                          )}>
                            {history.status === 'DONE' ? '✅ Completed' : '⏳ Pending'}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No kitchen history available</p>
                      <p className="text-sm text-gray-400 mt-2">Kitchen duty history will appear here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Leave History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Leave History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {profile.leaveHistory && profile.leaveHistory.length > 0 ? (
                    profile.leaveHistory.map((leave: any, index: number) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              📅 {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">Reason: {leave.reason}</p>
                            {leave.replacementStudent && (
                              <p className="text-sm text-blue-600 mt-1">
                                Replaced by: {leave.replacementStudent.name}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className={cn(
                            leave.status === 'APPROVED' 
                              ? "bg-green-50 text-green-700 border-green-200"
                              : leave.status === 'REJECTED'
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-yellow-50 text-yellow-700 border-yellow-200"
                          )}>
                            {leave.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No leave history available</p>
                      <p className="text-sm text-gray-400 mt-2">Leave requests will appear here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}