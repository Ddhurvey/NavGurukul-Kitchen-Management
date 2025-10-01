'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOut, User, Settings, ChefHat, Users } from 'lucide-react'
import EditProfile from './EditProfile'

export default function UserProfile() {
  const { user, logout, updateUser } = useAuth()

  if (!user) return null

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'FC':
        return <Badge variant="default">Food Coordinator</Badge>
      case 'TEAM_MEMBER':
        return <Badge variant="secondary">Team Member</Badge>
      default:
        return <Badge variant="outline">Student</Badge>
    }
  }

  const getWorkTypeBadge = (workType: string) => {
    switch (workType) {
      case 'KITCHEN':
        return <Badge variant="default">Kitchen</Badge>
      case 'TEAM':
        return <Badge variant="secondary">Team</Badge>
      default:
        return <Badge variant="outline">None</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'LEAVE':
        return <Badge className="bg-yellow-100 text-yellow-800">On Leave</Badge>
      case 'PLACED':
        return <Badge className="bg-purple-100 text-purple-800">Placed</Badge>
      default:
        return <Badge variant="secondary">Inactive</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={undefined} />
              <AvatarFallback>
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-red-600 hover:text-red-700"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Role</span>
            {getRoleBadge(user.role)}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Work Type</span>
            {getWorkTypeBadge(user.workType)}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            {getStatusBadge(user.status)}
          </div>
          {user.foodPreference && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Food Preference</span>
              <Badge variant="outline">
                {user.foodPreference === 'PANEER' ? 'Paneer 🧀' : 'Egg 🥚'}
              </Badge>
            </div>
          )}
          {user.discordId && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Discord</span>
              <span className="text-sm text-gray-600">{user.discordId}</span>
            </div>
          )}
        </div>
        <div className="mt-4 pt-4 border-t">
          <EditProfile 
            user={user} 
            onUpdate={() => {
              // Refresh user data after update
              updateUser()
            }} 
          />
        </div>
      </CardContent>
    </Card>
  )
}