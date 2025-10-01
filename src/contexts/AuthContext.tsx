'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  workType: string
  status: string
  role: 'STUDENT' | 'FC' | 'TEAM_MEMBER'
  foodPreference?: string
  discordId?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  updateUser: () => void
  isLoading: boolean
}

interface RegisterData {
  name: string
  email: string
  password: string
  discordId?: string
  foodPreference?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Only access localStorage on client side
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('auth_token')
      if (savedToken) {
        validateToken(savedToken)
      } else {
        setIsLoading(false)
      }
    } else {
      setIsLoading(false)
    }
  }, [])

  const validateToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setToken(token)
      } else {
        // Only access localStorage on client side
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token')
        }
      }
    } catch (error) {
      console.error('Token validation error:', error)
      // Only access localStorage on client side
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Login failed')
    }

    const data = await response.json()
    setUser(data.student)
    setToken(data.token)
    
    // Only access localStorage on client side
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', data.token)
    }
  }

  const register = async (data: RegisterData) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Registration failed')
    }

    const result = await response.json()
    setUser(result.student)
    setToken(result.token)
    
    // Only access localStorage on client side
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', result.token)
    }
  }

  const logout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token })
        })
      } catch (error) {
        console.error('Logout error:', error)
      }
    }

    setUser(null)
    setToken(null)
    
    // Only access localStorage on client side
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }

  const updateUser = async () => {
    if (token) {
      await validateToken(token)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      register,
      logout,
      updateUser,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}