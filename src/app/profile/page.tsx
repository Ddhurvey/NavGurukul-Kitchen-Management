'use client'

import { useState, useEffect } from 'react'
import ProfileManagement from '@/components/profile-management'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Get user ID from URL parameter or fallback to current user
    const getUrlParams = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const urlUserId = params.get('id')
        if (urlUserId) {
          setUserId(urlUserId)
          setLoading(false)
          return
        }
      }
      
      // Fallback: Get current user ID from localStorage or context
      // For demo purposes, we'll use the first active student
      const getCurrentUserId = async () => {
        try {
          const response = await fetch('/api/users')
          if (response.ok) {
            const users = await response.json()
            const activeStudent = users.find((user: any) => user.role === 'STUDENT' && user.status === 'ACTIVE')
            if (activeStudent) {
              setUserId(activeStudent.id)
            }
          }
        } catch (error) {
          console.error('Error getting current user:', error)
        } finally {
          setLoading(false)
        }
      }

      getCurrentUserId()
    }

    getUrlParams()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No active student profile found</p>
              <Button onClick={() => router.push('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.push('/')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
      
      <ProfileManagement userId={userId} />
    </div>
  )
}