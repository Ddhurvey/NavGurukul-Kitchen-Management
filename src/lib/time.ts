/**
 * Time utility functions with India timezone support
 */

export function getIndiaTime(): Date {
  const now = new Date()
  // Convert to India timezone (UTC+5:30)
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  const indiaTime = new Date(utc + (5.5 * 3600000))
  return indiaTime
}

export function getIndiaToday(): Date {
  const indiaTime = getIndiaTime()
  // Set to start of day in India timezone
  const today = new Date(indiaTime)
  today.setHours(0, 0, 0, 0)
  // Adjust back to UTC for database storage
  const utc = today.getTime() - (5.5 * 3600000)
  return new Date(utc)
}

export function isIndiaPast9PM(): boolean {
  const indiaTime = getIndiaTime()
  const hour = indiaTime.getHours()
  return hour >= 21 // 9 PM or later
}

export function isIndiaSaturday(): boolean {
  const indiaTime = getIndiaTime()
  return indiaTime.getDay() === 6 // Saturday is 6
}

export function isIndiaSunday(): boolean {
  const indiaTime = getIndiaTime()
  return indiaTime.getDay() === 0 // Sunday is 0
}

export function getIndiaTomorrow(): Date {
  const indiaToday = getIndiaToday()
  const tomorrow = new Date(indiaToday)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow
}

export function getIndiaNextSunday(): Date {
  const indiaTime = getIndiaTime()
  const daysUntilSunday = (7 - indiaTime.getDay()) % 7 || 7
  const nextSunday = new Date(indiaTime)
  nextSunday.setDate(nextSunday.getDate() + daysUntilSunday)
  nextSunday.setHours(0, 0, 0, 0)
  // Adjust back to UTC for database storage
  const utc = nextSunday.getTime() - (5.5 * 3600000)
  return new Date(utc)
}

export function formatIndiaDate(date: Date): string {
  const indiaTime = new Date(date.getTime() + (5.5 * 3600000))
  return indiaTime.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

export function formatIndiaDateTime(date: Date): string {
  const indiaTime = new Date(date.getTime() + (5.5 * 3600000))
  return indiaTime.toLocaleString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}