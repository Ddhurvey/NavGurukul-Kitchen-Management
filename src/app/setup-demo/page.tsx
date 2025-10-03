'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChefHat, Users, CheckCircle, AlertCircle } from 'lucide-react'

export default function SetupDemoPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const router = useRouter()

  const createDemoUser = async () => {
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/auth/create-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setIsSuccess(true)
        setMessage(data.message)
        
        // Auto-redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      } else {
        setIsSuccess(false)
        setMessage(data.error || 'Failed to create demo user')
      }
    } catch (error) {
      setIsSuccess(false)
      setMessage('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-full mb-4">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">NavGurukul Kitchen</h1>
          <p className="text-gray-600 mt-2">Demo User Setup</p>
        </div>

        {/* Setup Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-lg">Initialize Demo Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Instructions */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Create Demo User</p>
                  <p className="text-sm text-gray-600">
                    Sets up a demo student account with automatic kitchen rotation initialization
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Auto-Configuration</p>
                  <p className="text-sm text-gray-600">
                    Automatically creates rotation cycles, assigns first duty, and sets up food menu
                  </p>
                </div>
              </div>
            </div>

            {/* Demo Account Info */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-800 mb-2">Demo Account Details:</p>
              <div className="space-y-1">
                <p className="text-xs text-blue-700"><strong>Email:</strong> demo@navgurukul.org</p>
                <p className="text-xs text-blue-700"><strong>Password:</strong> demo123</p>
                <p className="text-xs text-blue-700"><strong>Role:</strong> Student</p>
                <p className="text-xs text-blue-700"><strong>Preference:</strong> Paneer</p>
              </div>
            </div>

            {/* Message */}
            {message && (
              <Alert className={isSuccess ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <AlertCircle className={`h-4 w-4 ${isSuccess ? 'text-green-600' : 'text-red-600'}`} />
                <AlertDescription className={isSuccess ? 'text-green-800' : 'text-red-800'}>
                  {message}
                </AlertDescription>
              </Alert>
            )}

            {/* Action Button */}
            <Button 
              onClick={createDemoUser}
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={loading || isSuccess}
            >
              {loading ? 'Creating Demo User...' : isSuccess ? 'Demo User Created!' : 'Create Demo User'}
            </Button>

            {/* Navigation Links */}
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-orange-500 hover:text-orange-600 font-medium">
                  Sign in
                </Link>
              </p>
              <p className="text-sm text-gray-600">
                Want to create a new account?{' '}
                <Link href="/signup" className="text-orange-500 hover:text-orange-600 font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}