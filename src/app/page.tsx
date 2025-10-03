'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Users, Utensils, ChefHat, Bell, Settings, User, LogOut, Menu, X, RefreshCw, Plus, Save, Edit2, MessageSquare, Copy, Upload } from 'lucide-react'
import { cn, getWeekNumber, getWeekDates } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

interface User {
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
}

interface KitchenTurnStudent {
  id: string
  student: User
}

interface KitchenTurn {
  id: string
  date: string
  status: string
  teamLeaderId?: string
  teamLeader?: User
  assignedStudents: KitchenTurnStudent[]
}

interface FoodMenu {
  id: string
  date: string
  breakfast?: string
  lunch?: string
  snacks?: string
  dinner?: string
  updatedBy: string
}

export default function Home() {
  const router = useRouter()
  const { user, loading: authLoading, logout, checkAuth } = useAuth()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [kitchenTurn, setKitchenTurn] = useState<KitchenTurn | null>(null)
  const [foodMenu, setFoodMenu] = useState<FoodMenu | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [healthStatus, setHealthStatus] = useState<any>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  
  // Weekly menu state
  const [weeklyMenu, setWeeklyMenu] = useState<any>(null)
  const [weeklySchedule, setWeeklySchedule] = useState<any>(null)
  const [selectedWeek, setSelectedWeek] = useState(getWeekNumber(new Date()))
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [isEditingWeeklyMenu, setIsEditingWeeklyMenu] = useState(false)
  const [isEditingWeeklySchedule, setIsEditingWeeklySchedule] = useState(false)
  
  // Leave management state
  const [leaveRequests, setLeaveRequests] = useState<any[]>([])
  const [rotationGroups, setRotationGroups] = useState<any[]>([])
  
  // Weekly menu template state
  const [weeklyMenuTemplate, setWeeklyMenuTemplate] = useState<any>(null)
  const [isEditingTemplate, setIsEditingTemplate] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState({
    monday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
    tuesday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
    wednesday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
    thursday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
    friday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
    saturday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
    sunday: { breakfast: '', lunch: '', snacks: '', dinner: '' }
  })
  
  // Kitchen turn creation state
  const [isCreatingKitchenTurn, setIsCreatingKitchenTurn] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [selectedTeamLeader, setSelectedTeamLeader] = useState<string>('')
  const [kitchenTurnDate, setKitchenTurnDate] = useState('')
  
  // Food menu editing state
  const [isEditingFoodMenu, setIsEditingFoodMenu] = useState(false)
  const [editingMenu, setEditingMenu] = useState({
    breakfast: '',
    lunch: '',
    snacks: '',
    dinner: ''
  })
  const [menuPermissions, setMenuPermissions] = useState<any>(null)
  
  // Discord message state
  const [discordMessage, setDiscordMessage] = useState<any>(null)
  const [discordMessageDate, setDiscordMessageDate] = useState('')
  const [customDiscordMessage, setCustomDiscordMessage] = useState('')
  const [includeLocation, setIncludeLocation] = useState(true)
  const [includeTeamDetails, setIncludeTeamDetails] = useState(true)
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)
  
  // Notification state
  const [sendingNotification, setSendingNotification] = useState(false)
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editingProfile, setEditingProfile] = useState({
    name: '',
    email: '',
    foodPreference: '',
    discordId: ''
  })
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Calendar },
    { id: 'kitchen', label: 'Kitchen Duty', icon: ChefHat },
    { id: 'food', label: 'Food Menu', icon: Utensils },
    { id: 'weekly-menu', label: 'Weekly Menu', icon: Calendar },
    { id: 'weekly-menu-template', label: 'Menu Template', icon: Settings },
    { id: 'discord-message', label: 'Discord Message', icon: MessageSquare },
    { id: 'weekly-schedule', label: 'Team Schedule', icon: Users },
    { id: 'leave-management', label: 'Leave Management', icon: Bell },
    { id: 'students', label: 'Student Data', icon: Users },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'leave', label: 'Leave Request', icon: Bell },
    { id: 'reports', label: 'Reports', icon: Settings },
    ...(user?.role === 'ADMIN' ? [{ id: 'settings', label: 'Settings', icon: Settings }] : [])
  ]

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [kitchenResponse, foodResponse, usersResponse, profileResponse] = await Promise.all([
        fetch('/api/kitchen/today'),
        fetch('/api/food/today'),
        fetch('/api/users'),
        fetch('/api/user/profile')
      ])

      if (kitchenResponse.ok) {
        const kitchenData = await kitchenResponse.json()
        setKitchenTurn(kitchenData)
      }

      if (foodResponse.ok) {
        const foodData = await foodResponse.json()
        setFoodMenu(foodData)
      }

      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData)
      }

      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        // Update user state with leave history
        if (user) {
          const updatedUser = {
            ...user,
            leaves: profileData.user.leaves || [],
            leaveRequests: profileData.user.leaveRequests || []
          }
          // Update the user context (this would need to be implemented in AuthContext)
          // For now, we'll store it in local state
          setUserProfileData(updatedUser)
        }
      } else {
        console.error('Failed to fetch profile:', profileResponse.status)
        // Continue without profile data - don't block the entire app
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const [userProfileData, setUserProfileData] = useState(user)

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  // Fetch health status when settings section is first opened
  useEffect(() => {
    if (activeSection === 'settings' && !healthStatus && user?.role === 'ADMIN') {
      const fetchHealthStatus = async () => {
        try {
          setHealthLoading(true)
          const response = await fetch('/api/admin/health-check')
          if (response.ok) {
            const data = await response.json()
            setHealthStatus(data)
          }
        } catch (error) {
          console.error('Error fetching health status:', error)
        } finally {
          setHealthLoading(false)
        }
      }
      fetchHealthStatus()
    }
  }, [activeSection, user])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  // Notification function
  const handleSendNotification = async (type: 'menu' | 'team') => {
    if (!['ADMIN', 'FC', 'TEAM_MEMBER', 'TEAM_LEADER'].includes(user.role)) {
      alert('You do not have permission to send notifications')
      return
    }

    setSendingNotification(true)
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Notification sent successfully!`)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to send notification')
      }
    } catch (error) {
      console.error('Error sending notification:', error)
      alert('Failed to send notification')
    } finally {
      setSendingNotification(false)
    }
  }

  // Kitchen turn management functions
  const handleCreateKitchenTurn = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch('/api/rotation/assignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: today
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsCreatingKitchenTurn(false);
        setSelectedStudents([]);
        setSelectedTeamLeader('');
        setKitchenTurnDate('');
        fetchData();
        alert('Kitchen turn created successfully using rotation system!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create kitchen turn');
      }
    } catch (error) {
      console.error('Error creating kitchen turn:', error);
      alert('Failed to create kitchen turn');
    }
  }

  // Kitchen turn management functions
  const handleAssignToToday = async () => {
    if (selectedStudents.length === 0) {
      alert('Please select students to assign')
      return
    }
    
    if (selectedStudents.length !== 4) {
      alert('Please select exactly 4 students for kitchen duty')
      return
    }

    try {
      const response = await fetch('/api/kitchen/today', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignedStudents: selectedStudents,
          teamLeaderId: selectedTeamLeader || selectedStudents[0]
        }),
      })

      if (response.ok) {
        setIsCreatingKitchenTurn(false)
        setSelectedStudents([])
        setSelectedTeamLeader('')
        setKitchenTurnDate('')
        fetchData()
        alert('Students assigned to today\'s kitchen turn successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to assign students')
      }
    } catch (error) {
      console.error('Error assigning students:', error)
      alert('Failed to assign students')
    }
  }

  const handleUpdateFoodMenu = async () => {
    try {
      const response = await fetch('/api/food/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          ...editingMenu
        }),
      })

      if (response.ok) {
        const updatedMenu = await response.json()
        setFoodMenu(updatedMenu)
        setIsEditingFoodMenu(false)
        fetchData()
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to update food menu')
      }
    } catch (error) {
      console.error('Error updating food menu:', error)
      alert('Failed to update food menu')
    }
  }

  const startEditingFoodMenu = () => {
    setEditingMenu({
      breakfast: foodMenu?.breakfast || '',
      lunch: foodMenu?.lunch || '',
      snacks: foodMenu?.snacks || '',
      dinner: foodMenu?.dinner || ''
    })
    setIsEditingFoodMenu(true)
  }

  const checkMenuPermissions = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`/api/food/menu-permissions?date=${today}`)
      if (response.ok) {
        const data = await response.json()
        setMenuPermissions(data)
      }
    } catch (error) {
      console.error('Error checking menu permissions:', error)
    }
  }

  // Profile editing functions
  const startEditingProfile = () => {
    setEditingProfile({
      name: user.name,
      email: user.email,
      foodPreference: user.foodPreference,
      discordId: user.discordId || ''
    })
    setIsEditingProfile(true)
  }

  const handleUpdateProfile = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingProfile)
      })

      if (response.ok) {
        const updatedUser = await response.json()
        // Update user context by re-checking auth
        await checkAuth()
        setIsEditingProfile(false)
        alert('Profile updated successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    }
  }

  const handleCancelEditProfile = () => {
    setIsEditingProfile(false)
    setEditingProfile({
      name: user.name,
      email: user.email,
      foodPreference: user.foodPreference,
      discordId: user.discordId || ''
    })
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/user/photo', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        // Update user photo in state
        window.location.reload() // Temporary solution
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to upload photo')
      }
    } catch (error) {
      console.error('Error uploading photo:', error)
      alert('Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleApplyLeave = async () => {
    const fromDate = (document.getElementById('leaveFromDate') as HTMLInputElement)?.value
    const toDate = (document.getElementById('leaveToDate') as HTMLInputElement)?.value
    const reason = (document.getElementById('leaveReason') as HTMLSelectElement)?.value
    const details = (document.getElementById('leaveDetails') as HTMLTextAreaElement)?.value

    if (!fromDate || !toDate || !reason) {
      alert('Please fill in all required fields')
      return
    }

    if (new Date(fromDate) > new Date(toDate)) {
      alert('From date cannot be after to date')
      return
    }

    if (new Date(fromDate) < new Date().setHours(0,0,0,0)) {
      alert('Cannot apply for leave in the past')
      return
    }

    try {
      const response = await fetch('/api/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: fromDate,
          endDate: toDate,
          reason,
          notes: details
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert('Leave application submitted successfully!')
        // Clear form
        (document.getElementById('leaveFromDate') as HTMLInputElement).value = ''
        (document.getElementById('leaveToDate') as HTMLInputElement).value = ''
        (document.getElementById('leaveReason') as HTMLSelectElement).value = ''
        (document.getElementById('leaveDetails') as HTMLTextAreaElement).value = ''
        // Refresh data
        fetchData()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to submit leave application')
      }
    } catch (error) {
      console.error('Error applying for leave:', error)
      alert('Failed to submit leave application')
    }
  }

  // Weekly menu functions
  const fetchWeeklyMenu = async () => {
    try {
      const response = await fetch(`/api/weekly-menu?week=${selectedWeek}&year=${selectedYear}`)
      if (response.ok) {
        const data = await response.json()
        setWeeklyMenu(data)
      }
    } catch (error) {
      console.error('Error fetching weekly menu:', error)
    }
  }

  const createWeeklyMenu = async () => {
    try {
      const response = await fetch('/api/weekly-menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekNumber: selectedWeek,
          year: selectedYear,
          createdBy: user.id,
          dailyMenus: getWeekDates(selectedWeek, selectedYear).map((date, index) => ({
            date: date.toISOString(),
            breakfast: ['Poha', 'Upma', 'Sandwich', 'Idli', 'Dosa', 'Paratha', 'Toast'][index],
            lunch: ['Dal Rice', 'Rajma Rice', 'Chole Rice', 'Sambar Rice', 'Curd Rice', 'Veg Biryani', 'Khichdi'][index],
            snacks: ['Samosa', 'Pakora', 'Vada', 'Biscuits', 'Fruits', 'Salad', 'Nuts'][index],
            dinner: ['Roti Sabzi', 'Puri Sabzi', 'Rice Dal', 'Khichdi', 'Soup Bread', 'Pasta', 'Noodles'][index]
          }))
        })
      })

      if (response.ok) {
        const data = await response.json()
        setWeeklyMenu(data)
        alert('Weekly menu created successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create weekly menu')
      }
    } catch (error) {
      console.error('Error creating weekly menu:', error)
      alert('Failed to create weekly menu')
    }
  }

  // Weekly schedule functions
  const fetchWeeklySchedule = async () => {
    try {
      const weekDates = getWeekDates(selectedWeek, selectedYear)
      const scheduleData = []
      
      for (const date of weekDates) {
        const response = await fetch(`/api/rotation/assignment?date=${date.toISOString()}`)
        if (response.ok) {
          const data = await response.json()
          scheduleData.push({
            date,
            ...data
          })
        }
      }
      
      setWeeklySchedule({
        weekNumber: selectedWeek,
        year: selectedYear,
        dailySchedules: scheduleData
      })
    } catch (error) {
      console.error('Error fetching weekly schedule:', error)
    }
  }

  const createWeeklySchedule = async () => {
    try {
      const response = await fetch('/api/rotation/assignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: getStartOfWeek(new Date()).toISOString()
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert('Weekly schedule created successfully using rotation system!');
        fetchWeeklySchedule();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create weekly schedule');
      }
    } catch (error) {
      console.error('Error creating weekly schedule:', error);
      alert('Failed to create weekly schedule')
    }
  }

  // Fetch weekly data when section changes
  useEffect(() => {
    if (activeSection === 'weekly-menu' && !weeklyMenu) {
      fetchWeeklyMenu()
    }
    if (activeSection === 'weekly-schedule' && !weeklySchedule) {
      fetchWeeklySchedule()
    }
  }, [activeSection])

  useEffect(() => {
    if (activeSection === 'weekly-menu') {
      fetchWeeklyMenu()
    }
  }, [selectedWeek, selectedYear])

  useEffect(() => {
    if (activeSection === 'weekly-schedule') {
      fetchWeeklySchedule()
    }
  }, [selectedWeek, selectedYear])

  // Weekly menu template functions
  const fetchWeeklyMenuTemplate = async () => {
    try {
      const response = await fetch('/api/weekly-menu-template')
      if (response.ok) {
        const data = await response.json()
        setWeeklyMenuTemplate(data)
      }
    } catch (error) {
      console.error('Error fetching weekly menu template:', error)
    }
  }

  const updateWeeklyMenuTemplate = async () => {
    try {
      const response = await fetch('/api/weekly-menu-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editingTemplate,
          createdBy: user.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        setWeeklyMenuTemplate(data)
        setIsEditingTemplate(false)
        alert('Weekly menu template updated successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update weekly menu template')
      }
    } catch (error) {
      console.error('Error updating weekly menu template:', error)
      alert('Failed to update weekly menu template')
    }
  }

  const applyWeeklyTemplate = async () => {
    try {
      const response = await fetch('/api/weekly-menu-template', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekNumber: selectedWeek,
          year: selectedYear,
          createdBy: user.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message || 'Weekly menu template applied successfully!')
        fetchWeeklyMenu() // Refresh the weekly menu view
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to apply weekly menu template')
      }
    } catch (error) {
      console.error('Error applying weekly menu template:', error)
      alert('Failed to apply weekly menu template')
    }
  }

  const startEditingTemplate = () => {
    if (weeklyMenuTemplate) {
      setEditingTemplate({
        monday: weeklyMenuTemplate.monday || { breakfast: '', lunch: '', snacks: '', dinner: '' },
        tuesday: weeklyMenuTemplate.tuesday || { breakfast: '', lunch: '', snacks: '', dinner: '' },
        wednesday: weeklyMenuTemplate.wednesday || { breakfast: '', lunch: '', snacks: '', dinner: '' },
        thursday: weeklyMenuTemplate.thursday || { breakfast: '', lunch: '', snacks: '', dinner: '' },
        friday: weeklyMenuTemplate.friday || { breakfast: '', lunch: '', snacks: '', dinner: '' },
        saturday: weeklyMenuTemplate.saturday || { breakfast: '', lunch: '', snacks: '', dinner: '' },
        sunday: weeklyMenuTemplate.sunday || { breakfast: '', lunch: '', snacks: '', dinner: '' }
      })
    }
    setIsEditingTemplate(true)
  }

  // Leave management functions
  const fetchLeaveRequests = async () => {
    try {
      const response = await fetch('/api/leave-requests')
      if (response.ok) {
        const data = await response.json()
        setLeaveRequests(data)
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error)
    }
  }

  const fetchRotationGroups = async () => {
    try {
      const response = await fetch('/api/rotation/groups')
      if (response.ok) {
        const data = await response.json()
        setRotationGroups(data)
      }
    } catch (error) {
      console.error('Error fetching rotation groups:', error)
    }
  }

  const initializeRotationGroups = async () => {
    try {
      const response = await fetch('/api/rotation/groups', {
        method: 'POST'
      })
      if (response.ok) {
        const data = await response.json()
        alert('Rotation groups initialized successfully!')
        fetchRotationGroups()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to initialize rotation groups')
      }
    } catch (error) {
      console.error('Error initializing rotation groups:', error)
      alert('Failed to initialize rotation groups')
    }
  }

  // Discord message functions
  const generateDiscordMessage = async (sendToDiscord: boolean = false) => {
    try {
      const targetDate = discordMessageDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      if (isCustomMode) {
        const response = await fetch('/api/discord-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: targetDate,
            customMessage: customDiscordMessage,
            includeLocation,
            includeTeamDetails,
            sendToDiscord
          })
        })

        if (response.ok) {
          const data = await response.json()
          setDiscordMessage(data)
          
          if (sendToDiscord) {
            if (data.discordSent) {
              alert('✅ Message sent to Discord successfully!')
            } else {
              alert(`❌ Failed to send to Discord: ${data.discordError || 'Unknown error'}`)
            }
          }
        } else {
          const error = await response.json()
          alert(error.error || 'Failed to generate custom Discord message')
        }
      } else {
        if (sendToDiscord) {
          // For standard mode, we need to use POST to send to Discord
          const response = await fetch('/api/discord-message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              date: targetDate,
              sendToDiscord
            })
          })

          if (response.ok) {
            const data = await response.json()
            setDiscordMessage(data)
            
            if (data.discordSent) {
              alert('✅ Message sent to Discord successfully!')
            } else {
              alert(`❌ Failed to send to Discord: ${data.discordError || 'Unknown error'}`)
            }
          } else {
            const error = await response.json()
            alert(error.error || 'Failed to send Discord message')
          }
        } else {
          const response = await fetch(`/api/discord-message?date=${targetDate}`)
          
          if (response.ok) {
            const data = await response.json()
            setDiscordMessage(data)
          } else {
            const error = await response.json()
            alert(error.error || 'Failed to generate Discord message')
          }
        }
      }
    } catch (error) {
      console.error('Error generating Discord message:', error)
      alert('Failed to generate Discord message')
    }
  }

  const copyToClipboard = async () => {
    if (discordMessage?.discordMessage) {
      try {
        await navigator.clipboard.writeText(discordMessage.discordMessage)
        setCopiedToClipboard(true)
        setTimeout(() => setCopiedToClipboard(false), 2000)
      } catch (error) {
        console.error('Failed to copy to clipboard:', error)
        alert('Failed to copy to clipboard')
      }
    }
  }

  // Fetch leave management data when section changes
  useEffect(() => {
    if (activeSection === 'leave-management') {
      fetchLeaveRequests()
      fetchRotationGroups()
    }
  }, [activeSection])

  // Fetch weekly menu template when section changes
  useEffect(() => {
    if (activeSection === 'weekly-menu-template' && !weeklyMenuTemplate) {
      fetchWeeklyMenuTemplate()
    }
  }, [activeSection])

  // Check menu permissions when food section is accessed
  useEffect(() => {
    if (activeSection === 'food') {
      checkMenuPermissions()
    }
  }, [activeSection])

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    router.push('/login')
    return null
  }

  const renderDashboard = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading dashboard...</span>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Kitchen Duty Dashboard</h1>
            <p className="text-gray-600 mt-1 truncate">Welcome back, {user.name}!</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 whitespace-nowrap">
              Active: {users.filter(u => u.status === 'ACTIVE').length}
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap text-xs sm:text-sm">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Badge>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Today's Kitchen Team */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <ChefHat className="h-5 w-5" />
              Today's Kitchen Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kitchenTurn && kitchenTurn.assignedStudents && kitchenTurn.assignedStudents.length > 0 ? (
              <div className="space-y-3">
                {kitchenTurn.assignedStudents.map((assignment) => (
                  <div
                    key={assignment.id}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md",
                      kitchenTurn.teamLeaderId === assignment.student.id
                        ? "border-yellow-400 bg-yellow-50"
                        : "border-gray-200 bg-white hover:border-orange-300"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => router.push(`/profile/${assignment.student.id}`)}
                          className="font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors text-left"
                        >
                          {assignment.student.name}
                        </button>
                        {kitchenTurn.teamLeaderId === assignment.student.id && (
                          <Badge variant="secondary" className="mt-1 bg-yellow-200 text-yellow-800 text-xs">
                            Team Leader
                          </Badge>
                        )}
                      </div>
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-semibold text-sm ml-2 flex-shrink-0">
                        {assignment.student.name.charAt(0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-medium mb-4">No kitchen team assigned for today</p>
                <p className="text-sm text-gray-400 mb-4">
                  Kitchen duties are assigned automatically based on rotation order.
                </p>
                <Button 
                  onClick={handleCreateKitchenTurn}
                  disabled={isCreatingKitchenTurn}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {isCreatingKitchenTurn ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating Assignment...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Today's Assignment
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Food Menu */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Utensils className="h-5 w-5" />
              Today's Food Menu
            </CardTitle>
          </CardHeader>
          <CardContent>
            {foodMenu ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2 text-sm sm:text-base">Breakfast</h4>
                  <p className="text-gray-700 text-sm">{foodMenu.breakfast || 'Not set'}</p>
                </div>
                <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">Lunch</h4>
                  <p className="text-gray-700 text-sm">{foodMenu.lunch || 'Not set'}</p>
                </div>
                <div className="p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-800 mb-2 text-sm sm:text-base">Snacks</h4>
                  <p className="text-gray-700 text-sm">{foodMenu.snacks || 'Not set'}</p>
                </div>
                <div className="p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-800 mb-2 text-sm sm:text-base">Dinner</h4>
                  <p className="text-gray-700 text-sm">{foodMenu.dinner || 'Not set'}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Utensils className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-medium mb-2">No food menu set for today</p>
                <p className="text-sm text-gray-400">
                  The food menu will be set automatically when the kitchen team is assigned.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Your Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Your Kitchen Turns</p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-900 mt-1">{user.totalKitchenTurns}</p>
                </div>
                <ChefHat className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Leave Days Taken</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-900 mt-1">{user.leaveDays}</p>
                </div>
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">Food Preference</p>
                  <p className="text-lg sm:text-xl font-bold text-purple-900 mt-1">{user.foodPreference}</p>
                </div>
                <Utensils className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-h-96 overflow-y-auto">
              {users.filter(u => u.status === 'ACTIVE').map((userItem) => (
                <div key={userItem.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{userItem.name}</p>
                      <p className="text-xs text-gray-500 truncate">{userItem.email}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {userItem.role}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                          {userItem.foodPreference}
                        </Badge>
                      </div>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs ml-2 flex-shrink-0">
                      {userItem.name.charAt(0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderProfile = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
            <p className="text-gray-600 mt-1">Manage your profile and preferences</p>
          </div>
          {!isEditingProfile && (
            <Button
              onClick={startEditingProfile}
              className="flex items-center gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>

        {/* Profile Overview */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditingProfile ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editingProfile.name}
                      onChange={(e) => setEditingProfile({...editingProfile, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editingProfile.email}
                      onChange={(e) => setEditingProfile({...editingProfile, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Food Preference
                    </label>
                    <select
                      value={editingProfile.foodPreference}
                      onChange={(e) => setEditingProfile({...editingProfile, foodPreference: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="PANEER">Paneer</option>
                      <option value="EGGS">Eggs</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discord ID (optional)
                    </label>
                    <input
                      type="text"
                      value={editingProfile.discordId}
                      onChange={(e) => setEditingProfile({...editingProfile, discordId: e.target.value})}
                      placeholder="Enter your Discord user ID (e.g., 123456789012345678)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Used for Discord notifications and mentions
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleUpdateProfile}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelEditProfile}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <div className="relative">
                  {user.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt={user.name}
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                    <Upload className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploadingPhoto}
                    />
                  </label>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                  <p className="text-gray-600">{user.email}</p>
                  {user.discordId && (
                    <p className="text-sm text-gray-500">Discord ID: {user.discordId}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {user.role}
                    </Badge>
                    <Badge variant="outline" className={cn(
                      "border",
                      user.status === 'ACTIVE' 
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-50 text-gray-700 border-gray-200"
                    )}>
                      {user.status}
                    </Badge>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      {user.foodPreference}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-600 text-sm font-medium">Kitchen Turns</p>
                  <p className="text-3xl font-bold text-orange-900 mt-1">{user.totalKitchenTurns}</p>
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
                  <p className="text-3xl font-bold text-green-900 mt-1">{user.leaveDays}</p>
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
                  <p className="text-xl font-bold text-purple-900 mt-1">{user.foodPreference}</p>
                </div>
                <Utensils className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Member Since</p>
                  <p className="text-lg font-bold text-blue-900 mt-1">
                    {new Date(user.createdAt).toLocaleDateString()}
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
              {userProfileData?.kitchenHistory && userProfileData.kitchenHistory.length > 0 ? (
                userProfileData.kitchenHistory.map((history: any, index: number) => (
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
                  <p className="text-sm text-gray-400 mt-2">Your kitchen duty history will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Leave Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Leave Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Leave Application Form */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-3">Apply for Leave</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      id="leaveFromDate"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      id="leaveToDate"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason
                  </label>
                  <select
                    id="leaveReason"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a reason</option>
                    <option value="HEALTH_ISSUE">Health Issue</option>
                    <option value="PERSONAL_WORK">Personal Work</option>
                    <option value="FAMILY_EMERGENCY">Family Emergency</option>
                    <option value="MEDICAL_APPOINTMENT">Medical Appointment</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Details (optional)
                  </label>
                  <textarea
                    id="leaveDetails"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Provide any additional details about your leave..."
                  />
                </div>
                <div className="mt-4">
                  <Button
                    onClick={handleApplyLeave}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Apply for Leave
                  </Button>
                </div>
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ <strong>Important:</strong> Leave applications submitted before 9 PM (or 9 AM Saturday for Sunday) will automatically update kitchen team assignments.
                  </p>
                </div>
              </div>

              {/* Leave History */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Leave History</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {userProfileData?.leaveHistory && userProfileData.leaveHistory.length > 0 ? (
                    userProfileData.leaveHistory.map((leave: any, index: number) => (
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
                      <p className="text-sm text-gray-400 mt-2">Your leave requests will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderSettings = () => {
    const fetchHealthStatus = async () => {
      try {
        setHealthLoading(true)
        const response = await fetch('/api/admin/health-check')
        if (response.ok) {
          const data = await response.json()
          setHealthStatus(data)
        }
      } catch (error) {
        console.error('Error fetching health status:', error)
      } finally {
        setHealthLoading(false)
      }
    }

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'pass': return 'text-green-600 bg-green-50 border-green-200'
        case 'warn': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
        case 'fail': return 'text-red-600 bg-red-50 border-red-200'
        default: return 'text-gray-600 bg-gray-50 border-gray-200'
      }
    }

    const getOverallStatusColor = (status: string) => {
      switch (status) {
        case 'healthy': return 'text-green-700 bg-green-100 border-green-300'
        case 'degraded': return 'text-yellow-700 bg-yellow-100 border-yellow-300'
        case 'unhealthy': return 'text-red-700 bg-red-100 border-red-300'
        default: return 'text-gray-700 bg-gray-100 border-gray-300'
      }
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
            <p className="text-gray-600 mt-1">System health and administrative settings</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchHealthStatus} disabled={healthLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", healthLoading && "animate-spin")} />
              Refresh Status
            </Button>
          </div>
        </div>

        {/* System Health Overview */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Settings className="h-5 w-5" />
              System Health Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthStatus ? (
              <div className="space-y-4">
                {/* Overall Status */}
                <div className="flex items-center justify-between p-4 rounded-lg border-2">
                  <div>
                    <h3 className="font-semibold text-lg">Overall System Status</h3>
                    <p className="text-sm text-gray-600">
                      Last checked: {new Date(healthStatus.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge className={cn("text-sm px-3 py-1", getOverallStatusColor(healthStatus.status))}>
                    {healthStatus.status.toUpperCase()}
                  </Badge>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-600 text-sm font-medium">Passed Checks</p>
                        <p className="text-2xl font-bold text-green-900">{healthStatus.summary.passedChecks}</p>
                      </div>
                      <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                        ✓
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-yellow-600 text-sm font-medium">Warnings</p>
                        <p className="text-2xl font-bold text-yellow-900">
                          {healthStatus.summary.failedChecks > 0 ? healthStatus.summary.failedChecks : 0}
                        </p>
                      </div>
                      <div className="h-8 w-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">
                        !
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-600 text-sm font-medium">Total Checks</p>
                        <p className="text-2xl font-bold text-blue-900">{healthStatus.summary.totalChecks}</p>
                      </div>
                      <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        /
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Checks */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Detailed Health Checks</h4>
                  {Object.entries(healthStatus.checks).map(([key, check]: [string, any]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-medium text-gray-900 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </h5>
                          <Badge className={cn("text-xs", getStatusColor(check.status))}>
                            {check.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{check.message}</p>
                        {check.error && (
                          <p className="text-xs text-red-600 mt-1">Error: {check.error}</p>
                        )}
                      </div>
                      {check.count !== undefined && (
                        <div className="ml-4 text-right">
                          <p className="text-lg font-semibold text-gray-900">{check.count}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                {healthLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Checking system health...</span>
                  </div>
                ) : (
                  <div>
                    <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium mb-2">System health check unavailable</p>
                    <p className="text-sm text-gray-400 mb-4">
                      Unable to fetch system health status. Please try again.
                    </p>
                    <Button variant="outline" onClick={fetchHealthStatus}>
                      Retry Health Check
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderKitchen = () => {
    const today = new Date().toISOString().split('T')[0]
    const hasTodayTurn = kitchenTurn && kitchenTurn.date === today
    const hasStudentsAssigned = hasTodayTurn && kitchenTurn.assignedStudents && kitchenTurn.assignedStudents.length > 0

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Kitchen Duty Management</h1>
            <p className="text-gray-600 mt-1">View and manage kitchen duty assignments</p>
          </div>
          <div className="flex gap-3">
            {!hasStudentsAssigned && (
              <Button 
                onClick={() => setIsCreatingKitchenTurn(true)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                {hasTodayTurn ? 'Assign Students' : 'Create Kitchen Turn'}
              </Button>
            )}
          </div>
        </div>

        {/* Create/Assign Kitchen Turn Form */}
        {isCreatingKitchenTurn && (
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Plus className="h-5 w-5" />
                {hasTodayTurn ? 'Assign Students to Today' : 'Create New Kitchen Turn'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!hasTodayTurn && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={kitchenTurnDate}
                    onChange={(e) => setKitchenTurnDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Students (4 recommended)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                  {users.filter(u => u.status === 'ACTIVE').map((student) => (
                    <div key={student.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`student-${student.id}`}
                        checked={selectedStudents.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents([...selectedStudents, student.id])
                          } else {
                            setSelectedStudents(selectedStudents.filter(id => id !== student.id))
                            if (selectedTeamLeader === student.id) {
                              setSelectedTeamLeader('')
                            }
                          }
                        }}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <label htmlFor={`student-${student.id}`} className="text-sm font-medium text-gray-700 cursor-pointer">
                        {student.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {selectedStudents.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-800">
                      Students Selected: {selectedStudents.length}/4
                    </span>
                    {selectedStudents.length !== 4 && (
                      <span className="text-xs text-blue-600">
                        Please select exactly 4 students
                      </span>
                    )}
                  </div>
                </div>
              )}

              {selectedStudents.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Leader (Optional - defaults to first selected)
                  </label>
                  <select
                    value={selectedTeamLeader}
                    onChange={(e) => setSelectedTeamLeader(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select Team Leader</option>
                    {selectedStudents.map(studentId => {
                      const student = users.find(u => u.id === studentId)
                      return (
                        <option key={studentId} value={studentId}>
                          {student?.name}
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={hasTodayTurn ? handleAssignToToday : handleCreateKitchenTurn}
                  className="bg-orange-600 hover:bg-orange-700"
                  disabled={selectedStudents.length !== 4}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {hasTodayTurn ? `Assign Students (${selectedStudents.length}/4)` : `Create Kitchen Turn (${selectedStudents.length}/4)`}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsCreatingKitchenTurn(false)
                    setSelectedStudents([])
                    setSelectedTeamLeader('')
                    setKitchenTurnDate('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Kitchen Turn */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <ChefHat className="h-5 w-5" />
              Today's Kitchen Duty
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kitchenTurn ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-semibold">{new Date(kitchenTurn.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <Badge variant={kitchenTurn.status === 'COMPLETED' ? 'default' : 'secondary'}>
                      {kitchenTurn.status}
                    </Badge>
                  </div>
                </div>
                
                {kitchenTurn.assignedStudents && kitchenTurn.assignedStudents.length > 0 ? (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Assigned Students:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {kitchenTurn.assignedStudents.map((assignment) => (
                        <div key={assignment.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-semibold">
                            {assignment.student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{assignment.student.name}</p>
                            <p className="text-xs text-gray-500">{assignment.student.email}</p>
                            {kitchenTurn.teamLeaderId === assignment.student.id && (
                              <Badge variant="outline" className="mt-1 bg-yellow-100 text-yellow-800 text-xs">
                                Team Leader
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium mb-2">No students assigned for today</p>
                    <p className="text-sm text-gray-400">
                      Click "Assign Students" to assign kitchen duties for today
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-medium mb-2">No kitchen duty for today</p>
                <p className="text-sm text-gray-400">
                  Click "Create Kitchen Turn" to create today's kitchen duty
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kitchen Duty Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Your Total Duties</p>
                  <p className="text-2xl font-bold text-gray-900">{user.totalKitchenTurns}</p>
                </div>
                <ChefHat className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Students</p>
                  <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.status === 'ACTIVE').length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Rotation Cycle</p>
                  <p className="text-2xl font-bold text-gray-900">4 Days</p>
                </div>
                <RefreshCw className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const renderFood = () => {
    const canEditMenu = menuPermissions?.canEdit && 
                       (user?.role === 'FC' || user?.role === 'ADMIN' || user?.role === 'TEAM_MEMBER')
    
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Food Menu Management</h1>
            <p className="text-gray-600 mt-1">View and manage daily food menus</p>
            {menuPermissions && (
              <div className="mt-2">
                {menuPermissions.isLocked ? (
                  <Badge variant="destructive" className="text-xs">
                    {menuPermissions.message}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-green-600">
                    {menuPermissions.message}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <Button 
            onClick={startEditingFoodMenu}
            className="bg-green-600 hover:bg-green-700"
            disabled={!canEditMenu}
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Menu
          </Button>
        </div>

        {/* Edit Food Menu Form */}
        {isEditingFoodMenu && (
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Edit2 className="h-5 w-5" />
                Edit Today's Menu
                {menuPermissions?.isPastDate && (
                  <Badge variant="destructive">Past Date - Locked</Badge>
                )}
                {menuPermissions?.isPast9PM && (
                  <Badge variant="destructive">Past 9 PM - Locked</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {menuPermissions?.isPastDate && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">
                    <strong>Cannot Edit:</strong> This menu is from a past date and is locked for historical purposes.
                  </p>
                </div>
              )}
              
              {menuPermissions?.isPast9PM && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-700 text-sm">
                    <strong>Cannot Edit:</strong> Menu editing is closed after 9:00 PM India time.
                  </p>
                </div>
              )}

              {menuPermissions?.isPastDate || menuPermissions?.isPast9PM ? (
                <div className="text-center py-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEditingFoodMenu(false)
                      setEditingMenu({
                        breakfast: '',
                        lunch: '',
                        snacks: '',
                        dinner: ''
                      })
                    }}
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Breakfast
                      </label>
                      <input
                        type="text"
                        value={editingMenu.breakfast}
                        onChange={(e) => setEditingMenu({...editingMenu, breakfast: e.target.value})}
                        placeholder="Enter breakfast menu"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lunch
                      </label>
                      <input
                        type="text"
                        value={editingMenu.lunch}
                        onChange={(e) => setEditingMenu({...editingMenu, lunch: e.target.value})}
                        placeholder="Enter lunch menu"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Snacks
                      </label>
                      <input
                        type="text"
                        value={editingMenu.snacks}
                        onChange={(e) => setEditingMenu({...editingMenu, snacks: e.target.value})}
                        placeholder="Enter snacks menu"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dinner
                      </label>
                      <input
                        type="text"
                        value={editingMenu.dinner}
                        onChange={(e) => setEditingMenu({...editingMenu, dinner: e.target.value})}
                        placeholder="Enter dinner menu"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {menuPermissions?.isSunday && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <h4 className="font-semibold text-orange-800 mb-2">Sunday Special Rule:</h4>
                      <p className="text-sm text-orange-700">
                        Sunday menu must include both Egg and Paneer items. Please ensure both are present in today's menu.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={handleUpdateFoodMenu}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={!editingMenu.breakfast && !editingMenu.lunch && !editingMenu.snacks && !editingMenu.dinner}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Update Menu
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsEditingFoodMenu(false)
                        setEditingMenu({
                          breakfast: '',
                          lunch: '',
                          snacks: '',
                          dinner: ''
                        })
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Today's Menu */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Utensils className="h-5 w-5" />
              Today's Menu
            </CardTitle>
          </CardHeader>
          <CardContent>
            {foodMenu ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-2">Breakfast</h3>
                  <p className="text-gray-700">{foodMenu.breakfast || 'Not set'}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-800 mb-2">Lunch</h3>
                  <p className="text-gray-700">{foodMenu.lunch || 'Not set'}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-purple-800 mb-2">Snacks</h3>
                  <p className="text-gray-700">{foodMenu.snacks || 'Not set'}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-orange-800 mb-2">Dinner</h3>
                  <p className="text-gray-700">{foodMenu.dinner || 'Not set'}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Utensils className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No menu set for today</p>
                <p className="text-sm text-gray-400 mt-2">
                  Click "Edit Menu" to create today's food menu
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Menu Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Menu Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-500">Weekly menu view will be available soon</p>
              <p className="text-sm text-gray-400 mt-2">This will show the menu for the entire week</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderStudents = () => {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Management</h1>
          <p className="text-gray-600 mt-1">View and manage student information</p>
        </div>

        {/* Students Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Active Students */}
              <div>
                <h3 className="text-lg font-semibold text-green-700 mb-3">Active Students ({users.filter(u => u.status === 'ACTIVE').length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {users.filter(u => u.status === 'ACTIVE').map((student) => (
                    <div key={student.id} className="p-4 bg-green-50 rounded-lg border border-green-200 cursor-pointer hover:bg-green-100 transition-colors" onClick={() => router.push(`/profile/${student.id}`)}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate hover:text-blue-600">{student.name}</p>
                          <p className="text-sm text-gray-500 truncate">{student.email}</p>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {student.role}
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                              {student.foodPreference}
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                              Duties: {student.totalKitchenTurns}
                            </Badge>
                          </div>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white font-semibold ml-2 flex-shrink-0">
                          {student.name.charAt(0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inactive Students */}
              {users.filter(u => u.status !== 'ACTIVE').length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-500 mb-3">Inactive Students ({users.filter(u => u.status !== 'ACTIVE').length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.filter(u => u.status !== 'ACTIVE').map((student) => (
                      <div key={student.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 opacity-75">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-600 truncate">{student.name}</p>
                            <p className="text-sm text-gray-400 truncate">{student.email}</p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {student.role}
                              </Badge>
                              <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                                {student.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-semibold ml-2 flex-shrink-0">
                            {student.name.charAt(0)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderLeave = () => {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-600 mt-1">Manage leave requests and track attendance</p>
        </div>

        {/* Leave Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Your Leave Days</p>
                  <p className="text-2xl font-bold text-blue-900">{user.leaveDays}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Active Students</p>
                  <p className="text-2xl font-bold text-green-900">{users.filter(u => u.status === 'ACTIVE').length}</p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-600 text-sm font-medium">Pending Requests</p>
                  <p className="text-2xl font-bold text-orange-900">0</p>
                </div>
                <Bell className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leave Request Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Request Leave
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium mb-2">Leave request form coming soon</p>
              <p className="text-sm text-gray-400">
                You will be able to submit leave requests and track their status here
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Leave History */}
        <Card>
          <CardHeader>
            <CardTitle>Leave History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-500">No leave history available</p>
              <p className="text-sm text-gray-400 mt-2">Your leave requests and approvals will appear here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderReports = () => {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">View reports and system analytics</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Today</p>
                  <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.status === 'ACTIVE').length}</p>
                </div>
                <Calendar className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Duties</p>
                  <p className="text-2xl font-bold text-gray-900">{users.reduce((sum, u) => sum + u.totalKitchenTurns, 0)}</p>
                </div>
                <ChefHat className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Leave Days</p>
                  <p className="text-2xl font-bold text-gray-900">{users.reduce((sum, u) => sum + u.leaveDays, 0)}</p>
                </div>
                <Bell className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Kitchen Duty Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Detailed kitchen duty reports coming soon</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Attendance analytics coming soon</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const renderWeeklyMenu = () => {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Weekly Menu Schedule</h1>
            <p className="text-gray-600 mt-1">Plan and manage weekly food menus</p>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={selectedWeek} 
              onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 52 }, (_, i) => i + 1).map(week => (
                <option key={week} value={week}>Week {week}</option>
              ))}
            </select>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
            </select>
            <Button onClick={() => fetchWeeklyMenu()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Load
            </Button>
          </div>
        </div>

        {weeklyMenu ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Week {weeklyMenu.weekNumber} - {weeklyMenu.year}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={weeklyMenu.status === 'APPROVED' ? 'default' : 'secondary'}>
                      {weeklyMenu.status}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => setIsEditingWeeklyMenu(true)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {weeklyMenu.dailyMenus?.map((menu: any) => (
                    <Card key={menu.id} className="border-l-4 border-l-green-500">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">
                          {new Date(menu.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <span className="text-xs font-medium text-green-700">Breakfast:</span>
                          <p className="text-sm text-gray-700">{menu.breakfast || 'Not set'}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-blue-700">Lunch:</span>
                          <p className="text-sm text-gray-700">{menu.lunch || 'Not set'}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-purple-700">Snacks:</span>
                          <p className="text-sm text-gray-700">{menu.snacks || 'Not set'}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-orange-700">Dinner:</span>
                          <p className="text-sm text-gray-700">{menu.dinner || 'Not set'}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium mb-2">No weekly menu found</p>
              <p className="text-sm text-gray-400 mb-4">Create a new weekly menu for this week</p>
              <Button onClick={createWeeklyMenu}>
                <Plus className="h-4 w-4 mr-2" />
                Create Weekly Menu
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const renderWeeklyMenuTemplate = () => {
    const days = [
      { key: 'monday', label: 'Monday', colorClass: 'bg-blue-500' },
      { key: 'tuesday', label: 'Tuesday', colorClass: 'bg-green-500' },
      { key: 'wednesday', label: 'Wednesday', colorClass: 'bg-yellow-500' },
      { key: 'thursday', label: 'Thursday', colorClass: 'bg-purple-500' },
      { key: 'friday', label: 'Friday', colorClass: 'bg-pink-500' },
      { key: 'saturday', label: 'Saturday', colorClass: 'bg-indigo-500' },
      { key: 'sunday', label: 'Sunday (Special)', colorClass: 'bg-red-500' }
    ]

    const meals = ['breakfast', 'lunch', 'snacks', 'dinner']

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Weekly Menu Template</h1>
            <p className="text-gray-600 mt-1">
              Configure the default weekly menu schedule. Sunday must include both Egg and Paneer items.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditingTemplate && (
              <>
                <Button 
                  onClick={startEditingTemplate}
                  variant="outline"
                  disabled={!weeklyMenuTemplate || user?.role === 'STUDENT'}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Template
                </Button>
                <Button 
                  onClick={applyWeeklyTemplate}
                  className="bg-orange-500 hover:bg-orange-600"
                  disabled={!weeklyMenuTemplate || user?.role === 'STUDENT'}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Apply to Week {selectedWeek}
                </Button>
              </>
            )}
            {isEditingTemplate && (
              <>
                <Button 
                  onClick={updateWeeklyMenuTemplate}
                  className="bg-green-500 hover:bg-green-600"
                  disabled={user?.role === 'STUDENT'}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </Button>
                <Button 
                  onClick={() => setIsEditingTemplate(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        {weeklyMenuTemplate && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Weekly Menu Schedule Template
                {weeklyMenuTemplate.isDefault && (
                  <Badge variant="outline">Default Template</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                {days.map((day) => (
                  <div key={day.key} className="space-y-3">
                    <div className={cn(
                      "p-3 rounded-lg text-white font-semibold text-center",
                      day.key === 'sunday' ? "bg-red-500" : day.colorClass
                    )}>
                      {day.label}
                      {day.key === 'sunday' && (
                        <div className="text-xs font-normal">Egg + Paneer Required</div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {meals.map((meal) => (
                        <div key={meal} className="space-y-1">
                          <label className="text-xs font-medium text-gray-600 capitalize">
                            {meal}
                          </label>
                          {isEditingTemplate && user?.role !== 'STUDENT' ? (
                            <input
                              type="text"
                              value={editingTemplate[day.key][meal] || ''}
                              onChange={(e) => setEditingTemplate(prev => ({
                                ...prev,
                                [day.key]: {
                                  ...prev[day.key],
                                  [meal]: e.target.value
                                }
                              }))}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder={`Enter ${meal} item`}
                            />
                          ) : (
                            <div className="p-2 bg-gray-50 rounded text-sm min-h-[2rem]">
                              {weeklyMenuTemplate[day.key]?.[meal] || (
                                <span className="text-gray-400">Not set</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {isEditingTemplate && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">Important Rules:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Sunday menu must include both Egg and Paneer items</li>
                    <li>• This template will be reused every week unless modified</li>
                    <li>• FC can edit any day's menu, team members can propose changes</li>
                    <li>• Once a day is over, the menu becomes locked history</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const renderDiscordMessage = () => {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Discord Message Generator</h1>
            <p className="text-gray-600 mt-1">Generate formatted Discord messages for kitchen announcements</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsCustomMode(!isCustomMode)}
            >
              {isCustomMode ? 'Standard Mode' : 'Custom Mode'}
            </Button>
          </div>
        </div>

        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Message Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={discordMessageDate}
                  onChange={(e) => setDiscordMessageDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {isCustomMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Message
                  </label>
                  <input
                    type="text"
                    value={customDiscordMessage}
                    onChange={(e) => setCustomDiscordMessage(e.target.value)}
                    placeholder="Enter custom message"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {isCustomMode && (
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeLocation}
                    onChange={(e) => setIncludeLocation(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Include Location</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeTeamDetails}
                    onChange={(e) => setIncludeTeamDetails(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Include Team Details</span>
                </label>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button 
                onClick={() => generateDiscordMessage(false)}
                className="w-full md:w-auto"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Generate Discord Message
              </Button>
              
              <Button 
                onClick={() => generateDiscordMessage(true)}
                className="w-full md:w-auto bg-green-600 hover:bg-green-700"
                disabled={!discordMessage?.metadata?.discordConfigured}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send to Discord
              </Button>
            </div>
            
            {!discordMessage?.metadata?.discordConfigured && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Discord not configured. Please set up Discord webhook or bot token in environment variables.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generated Message */}
        {discordMessage && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Generated Discord Message
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {discordMessage.metadata?.date || 'Selected Date'}
                  </Badge>
                  {discordMessage.metadata?.discordConfigured && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Discord Configured
                    </Badge>
                  )}
                  {discordMessage.discordSent && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Sent to Discord ✅
                    </Badge>
                  )}
                  {discordMessage.discordError && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      Discord Error ❌
                    </Badge>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={copyToClipboard}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {copiedToClipboard ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Message Preview */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                    {discordMessage.discordMessage}
                  </pre>
                </div>

                {/* Raw Data */}
                {discordMessage.rawData && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Message Details:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Date:</span>
                        <span className="ml-2 text-gray-800">{discordMessage.rawData.date}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Team Size:</span>
                        <span className="ml-2 text-gray-800">{discordMessage.metadata?.teamSize} students</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Location:</span>
                        <span className="ml-2 text-gray-800">{discordMessage.rawData.location}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Updated By:</span>
                        <span className="ml-2 text-gray-800">{discordMessage.rawData.updatedBy}</span>
                      </div>
                    </div>

                    {/* Team Members */}
                    <div className="mt-4">
                      <h5 className="font-medium text-gray-700 mb-2">Team Members:</h5>
                      <div className="space-y-1">
                        {discordMessage.rawData.kitchenTeam.map((member: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-gray-800">{member.discordTag}</span>
                            {member.isTeamLeader && (
                              <Badge variant="outline" className="text-xs">T.L</Badge>
                            )}
                            {member.isIT && (
                              <Badge variant="outline" className="text-xs">IT</Badge>
                            )}
                            <span className="text-gray-500">({member.foodPreference})</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Meals */}
                    <div className="mt-4">
                      <h5 className="font-medium text-gray-700 mb-2">Meals:</h5>
                      <div className="space-y-1 text-sm">
                        <div><span className="font-medium">Breakfast:</span> {discordMessage.rawData.meals.breakfast}</div>
                        <div><span className="font-medium">Lunch:</span> {discordMessage.rawData.meals.lunch}</div>
                        <div><span className="font-medium">Dinner:</span> {discordMessage.rawData.meals.dinner}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h4 className="font-semibold text-blue-800 mb-2">How to Use:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Select the date for which you want to generate the message</li>
              <li>• Choose between Standard mode (template) or Custom mode</li>
              <li>• Click "Generate Discord Message" to create the formatted message</li>
              <li>• Click "Copy" to copy the message to your clipboard</li>
              <li>• Paste the message in Discord to notify the team</li>
              <li>• Team members will be mentioned with @ tags and roles (T.L, IT)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderWeeklySchedule = () => {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Kitchen Team Schedule (4 Students/Day)</h1>
            <p className="text-gray-600 mt-1">Rotating kitchen team assignments with Sunday special rules</p>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={selectedWeek} 
              onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 52 }, (_, i) => i + 1).map(week => (
                <option key={week} value={week}>Week {week}</option>
              ))}
            </select>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
            </select>
            <Button onClick={() => fetchWeeklySchedule()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Load
            </Button>
          </div>
        </div>

        {/* Rotation Groups Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Rotation System</h3>
            <p className="text-sm text-blue-700">
              • 4 students assigned per day in rotating groups<br/>
              • No repeats until all students have had their turn<br/>
              • Sunday teams must include at least 1 Egg student<br/>
              • Leave requests before 9 PM: Auto-replacement<br/>
              • Leave requests after 9 PM: Team remains unchanged
            </p>
          </CardContent>
        </Card>

        {weeklySchedule && weeklySchedule.dailySchedules ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Week {weeklySchedule.weekNumber} - {weeklySchedule.year}</CardTitle>
                  <Button onClick={createWeeklySchedule}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Missing Assignments
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {weeklySchedule.dailySchedules.map((schedule: any) => (
                    <Card key={schedule.date} className={cn(
                      "border-l-4",
                      schedule.isSundayTeam ? "border-l-purple-500 bg-purple-50" : "border-l-blue-500"
                    )}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          {new Date(schedule.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                          {schedule.isSundayTeam && (
                            <Badge variant="secondary" className="text-xs bg-purple-200 text-purple-800">
                              Sunday Special
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="space-y-1">
                          {schedule.assignedStudents?.map((assignment: any) => (
                            <div key={assignment.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "h-6 w-6 rounded-full flex items-center justify-center text-white font-semibold text-xs",
                                  assignment.student.foodPreference === 'EGGS' 
                                    ? "bg-gradient-to-br from-yellow-400 to-orange-500" 
                                    : "bg-gradient-to-br from-green-400 to-blue-500"
                                )}>
                                  {assignment.student.name.charAt(0)}
                                </div>
                                <span className="text-sm font-medium">{assignment.student.name}</span>
                                {schedule.teamLeaderId === assignment.student.id && (
                                  <Badge variant="secondary" className="text-xs">Leader</Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {assignment.student.foodPreference === 'EGGS' ? '🥚' : '🧀'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                        {schedule.isSundayTeam && (
                          <div className="mt-2 p-2 bg-purple-100 rounded text-xs text-purple-800">
                            <strong>Sunday Special:</strong> Egg + Paneer Menu
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium mb-2">No weekly schedule found</p>
              <p className="text-sm text-gray-400 mb-4">Create assignments using the rotation system</p>
              <Button onClick={createWeeklySchedule}>
                <Plus className="h-4 w-4 mr-2" />
                Create Weekly Schedule
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const renderLeaveManagement = () => {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
            <p className="text-gray-600 mt-1">Manage leave requests and swap history with 9 PM cutoff rules</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={fetchLeaveRequests}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* 9 PM Rule Info */}
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <h3 className="font-semibold text-orange-800 mb-2">9 PM Cutoff Rule</h3>
            <p className="text-sm text-orange-700">
              • Leave requests <strong>before 9 PM</strong> on duty day: Auto-replacement with next available student<br/>
              • Leave requests <strong>after 9 PM</strong> on duty day: Team remains unchanged<br/>
              • All swap history is tracked in student profiles<br/>
              • System ensures fair rotation and maintains team balance
            </p>
          </CardContent>
        </Card>

        {/* Rotation Groups */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Rotation Groups (4 Students Each)</CardTitle>
                <Button variant="outline" size="sm" onClick={initializeRotationGroups}>
                  <Plus className="h-4 w-4 mr-2" />
                  Initialize
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {rotationGroups.length > 0 ? (
                <div className="space-y-3">
                  {rotationGroups.map((group: any) => (
                    <div key={group.groupId} className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-2">Group {group.groupId + 1}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {group.students.map((student: any) => (
                          <div key={student.id} className="flex items-center gap-2">
                            <div className={cn(
                              "h-6 w-6 rounded-full flex items-center justify-center text-white font-semibold text-xs",
                              student.foodPreference === 'EGGS' 
                                ? "bg-gradient-to-br from-yellow-400 to-orange-500" 
                                : "bg-gradient-to-br from-green-400 to-blue-500"
                            )}>
                              {student.name.charAt(0)}
                            </div>
                            <span className="text-sm">{student.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {student.foodPreference === 'EGGS' ? '🥚' : '🧀'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No rotation groups found</p>
                  <Button variant="outline" size="sm" onClick={initializeRotationGroups} className="mt-2">
                    Initialize Groups
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Leave Requests */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Leave Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {leaveRequests.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {leaveRequests.slice(0, 10).map((request: any) => (
                    <div key={request.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-sm">{request.student.name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(request.date).toLocaleDateString()} - {request.reason}
                          </p>
                        </div>
                        <Badge variant={request.status === 'PROCESSED' ? 'default' : 'secondary'}>
                          {request.status}
                        </Badge>
                      </div>
                      {request.replacementStudent && (
                        <div className="text-xs text-green-600">
                          Replaced by: {request.replacementStudent.name}
                          {request.autoReplaced && ' (Auto)'}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        Requested: {new Date(request.requestTime).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No leave requests found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Leave Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {leaveRequests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Student</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Reason</th>
                      <th className="text-left p-2">Requested</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Replacement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.map((request: any) => (
                      <tr key={request.id} className="border-b">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "h-6 w-6 rounded-full flex items-center justify-center text-white font-semibold text-xs",
                              request.student.foodPreference === 'EGGS' 
                                ? "bg-gradient-to-br from-yellow-400 to-orange-500" 
                                : "bg-gradient-to-br from-green-400 to-blue-500"
                            )}>
                              {request.student.name.charAt(0)}
                            </div>
                            {request.student.name}
                          </div>
                        </td>
                        <td className="p-2">{new Date(request.date).toLocaleDateString()}</td>
                        <td className="p-2">{request.reason}</td>
                        <td className="p-2">{new Date(request.requestTime).toLocaleString()}</td>
                        <td className="p-2">
                          <Badge variant={request.status === 'PROCESSED' ? 'default' : 'secondary'}>
                            {request.status}
                          </Badge>
                        </td>
                        <td className="p-2">
                          {request.replacementStudent ? (
                            <div className="flex items-center gap-1">
                              <span>{request.replacementStudent.name}</span>
                              {request.autoReplaced && (
                                <Badge variant="outline" className="text-xs">Auto</Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-medium mb-2">No leave requests found</p>
                <p className="text-sm text-gray-400">Leave requests will appear here when students apply for leave</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboard()
      case 'kitchen':
        return renderKitchen()
      case 'food':
        return renderFood()
      case 'weekly-menu':
        return renderWeeklyMenu()
      case 'weekly-menu-template':
        return renderWeeklyMenuTemplate()
      case 'discord-message':
        return renderDiscordMessage()
      case 'weekly-schedule':
        return renderWeeklySchedule()
      case 'leave-management':
        return renderLeaveManagement()
      case 'students':
        return renderStudents()
      case 'profile':
        return renderProfile()
      case 'leave':
        return renderLeave()
      case 'reports':
        return renderReports()
      case 'settings':
        return user.role === 'ADMIN' ? renderSettings() : (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Access denied. Admin privileges required.</p>
          </div>
        )
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">This section is coming soon...</p>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden p-2 h-9 w-9"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle menu"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <h1 className="ml-2 md:ml-0 text-lg sm:text-xl font-bold text-gray-900 truncate">
                NavGurukul Kitchen
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {['ADMIN', 'FC', 'TEAM_MEMBER', 'TEAM_LEADER'].includes(user.role) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleSendNotification('menu')}
                  disabled={sendingNotification}
                  className="relative p-2 h-9 w-9 sm:h-auto sm:w-auto sm:px-3"
                  title="Send today's menu to Discord"
                >
                  <Bell className={cn("h-4 w-4", sendingNotification && "animate-pulse")} />
                  {sendingNotification && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-ping"></span>
                  )}
                </Button>
              )}
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs sm:text-sm">
                {user.name.charAt(0)}
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="p-2 h-9 w-9 sm:h-auto sm:w-auto sm:px-3" aria-label="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen transition-all duration-200",
          "fixed md:sticky md:top-14 md:mt-0",
          "top-14 left-0 h-[calc(100vh-3.5rem)] md:h-auto",
          "transform -translate-x-full md:translate-x-0",
          "z-30",
          sidebarOpen && "translate-x-0"
        )}>
          <nav className="p-3 sm:p-4 space-y-1 sm:space-y-2 overflow-y-auto h-full">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id)
                    setSidebarOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    "min-h-[44px] touch-manipulation", // Minimum touch target
                    activeSection === item.id
                      ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="max-w-full overflow-x-hidden">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}