'use client'

import { useAuth } from '@/contexts/AuthContext'
import { ReactNode } from 'react'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: string[]
  fallback?: ReactNode
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { user } = useAuth()

  if (!user) {
    return <>{fallback}</>
  }

  if (!allowedRoles.includes(user.role)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

interface PermissionGuardProps {
  children: ReactNode
  requiresAuth?: boolean
  fallback?: ReactNode
}

export function PermissionGuard({ 
  children, 
  requiresAuth = true, 
  fallback = null 
}: PermissionGuardProps) {
  const { user } = useAuth()

  if (requiresAuth && !user) {
    return <>{fallback}</>
  }

  return <>{children}</>
}