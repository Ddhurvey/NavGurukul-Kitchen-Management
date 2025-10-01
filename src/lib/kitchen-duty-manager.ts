import { db } from '@/lib/db'
import { KitchenDutyScheduler } from './kitchen-duty-scheduler'

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1422903085680033853/mVeuOQhZk7ocLABZG1fTPcNWf4I5rx98gvRYkjSPZx27rzgkdQamXJIPOW7fJLV5nCPF'

export class KitchenDutyManager {
  private readonly CUTOFF_TIME = 21 // 9 PM in 24-hour format
  
  /**
   * Check if current time is before 9 PM cutoff
   */
  private isBeforeCutoff(date: Date = new Date()): boolean {
    return date.getHours() < this.CUTOFF_TIME
  }

  /**
   * Get tomorrow's date at midnight
   */
  private getTomorrowDate(): Date {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    return tomorrow
  }

  /**
   * Get today's date at midnight
   */
  private getTodayDate(): Date {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  }

  /**
   * Create kitchen history record
   */
  private async createHistoryRecord(kitchenDuty: any): Promise<void> {
    const teamMembers = kitchenDuty.assignments
      .filter((a: any) => !a.isTeamLead)
      .map((a: any) => a.studentId)
    
    const foodPreferences = kitchenDuty.assignments
      .map((a: any) => a.student.foodPreference)

    await db.kitchenHistory.create({
      data: {
        date: kitchenDuty.date,
        teamLeadId: kitchenDuty.teamLeadId,
        teamMembers: JSON.stringify(teamMembers),
        foodPreferences: JSON.stringify(foodPreferences),
        isSundaySpecial: kitchenDuty.isSundaySpecial,
        cycleNumber: kitchenDuty.cycleNumber,
        dayInCycle: kitchenDuty.dayInCycle,
        status: 'assigned'
      }
    })
  }

  /**
   * Get approved leaves for a specific date
   */
  private async getApprovedLeaves(date: Date): Promise<string[]> {
    const leaves = await db.leave.findMany({
      where: {
        status: 'approved',
        startDate: { lte: date },
        endDate: { gte: date }
      }
    })
    return leaves.map(leave => leave.studentId)
  }

  /**
   * Process leave request with 9 PM cutoff logic
   */
  async processLeaveRequest(studentId: string, startDate: Date, endDate: Date, reason: string): Promise<{
    success: boolean
    message: string
    cutoffPassed?: boolean
  }> {
    try {
      const tomorrow = this.getTomorrowDate()
      const isBeforeCutoff = this.isBeforeCutoff()
      
      // Check if leave is for tomorrow and cutoff has passed
      if (startDate <= tomorrow && !isBeforeCutoff) {
        return {
          success: false,
          message: 'Leave request rejected. 9 PM cutoff has passed for tomorrow\'s duty.',
          cutoffPassed: true
        }
      }

      // Create leave request
      const leave = await db.leave.create({
        data: {
          studentId,
          startDate,
          endDate,
          reason,
          status: 'approved' // Auto-approve for now
        }
      })

      // If leave affects tomorrow's duty, reassign
      if (startDate <= tomorrow) {
        await this.reassignTomorrowDuty()
      }

      return {
        success: true,
        message: `Leave approved for ${reason}. ${startDate <= tomorrow ? 'Tomorrow\'s duty will be reassigned.' : ''}`
      }

    } catch (error) {
      console.error('Error processing leave request:', error)
      return {
        success: false,
        message: 'Failed to process leave request'
      }
    }
  }

  /**
   * Reassign tomorrow's duty when someone takes leave
   */
  private async reassignTomorrowDuty(): Promise<void> {
    const tomorrow = this.getTomorrowDate()
    
    // Delete existing assignment
    await db.kitchenDuty.delete({
      where: { date: tomorrow }
    })

    // Create new assignment
    const scheduler = new KitchenDutyScheduler()
    const result = await scheduler.assignDuty(tomorrow)
    
    if (result.success) {
      await this.createHistoryRecord(result)
      console.log('Tomorrow\'s duty reassigned due to leave:', result.teamLead?.name)
    }
  }

  /**
   * Daily automated assignment at 9 PM
   */
  async performDailyAssignment(): Promise<{
    success: boolean
    message: string
    assignment?: any
  }> {
    try {
      const tomorrow = this.getTomorrowDate()
      
      // Check if already assigned
      const existing = await db.kitchenDuty.findUnique({
        where: { date: tomorrow }
      })

      if (existing) {
        return {
          success: true,
          message: 'Tomorrow\'s duty already assigned',
          assignment: existing
        }
      }

      // Perform assignment
      const scheduler = new KitchenDutyScheduler()
      const result = await scheduler.assignDuty(tomorrow)
      
      if (!result.success) {
        return {
          success: false,
          message: result.error || 'Failed to assign duty'
        }
      }

      // Create history record
      await this.createHistoryRecord(result)

      // Schedule notification
      await this.scheduleNotification('daily_assignment', tomorrow)

      return {
        success: true,
        message: 'Daily assignment completed successfully',
        assignment: result
      }

    } catch (error) {
      console.error('Error in daily assignment:', error)
      return {
        success: false,
        message: 'Failed to perform daily assignment'
      }
    }
  }

  /**
   * Schedule notification for later sending
   */
  private async scheduleNotification(type: string, targetDate: Date): Promise<void> {
    const scheduledTime = new Date(targetDate)
    scheduledTime.setHours(21, 0, 0, 0) // 9 PM

    await db.notificationSchedule.create({
      data: {
        type,
        scheduledTime,
        targetDate,
        message: '', // Will be generated when sending
        status: 'pending'
      }
    })
  }

  /**
   * Send daily notification at 9 PM
   */
  async sendDailyNotification(): Promise<{
    success: boolean
    message: string
    notification?: any
  }> {
    try {
      const tomorrow = this.getTomorrowDate()
      
      // Get tomorrow's assignment
      const kitchenDuty = await db.kitchenDuty.findUnique({
        where: { date: tomorrow },
        include: {
          teamLead: true,
          assignments: {
            include: { student: true }
          }
        }
      })

      if (!kitchenDuty) {
        return {
          success: false,
          message: 'No assignment found for tomorrow'
        }
      }

      // Format notification message
      const teamLead = kitchenDuty.assignments.find(a => a.isTeamLead)?.student
      const teamMembers = kitchenDuty.assignments.filter(a => !a.isTeamLead).map(a => a.student)
      
      const dayName = tomorrow.toLocaleDateString('en-US', { weekday: 'long' })
      const dateStr = tomorrow.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      
      const message = `📢 Tomorrow's Kitchen Team (${dayName}, ${dateStr}):
${teamLead ? `- ${teamLead.name} (Team Lead)` : ''}
${teamMembers.map(member => `- ${member.name} (${member.foodPreference})`).join('\n')}

⏰ Please be ready by 7:00 AM
📝 Team lead should coordinate with all members
🍳 Follow the kitchen duty guidelines

Good luck with your kitchen duty! 🎉`

      // Send to Discord
      const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message,
          username: 'Kitchen Duty Bot',
          avatar_url: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'
        })
      })

      if (!discordResponse.ok) {
        throw new Error(`Discord webhook failed: ${discordResponse.status}`)
      }

      // Store notification
      await db.notification.create({
        data: {
          type: 'DAILY_KITCHEN_DUTY',
          message,
          targetDate: tomorrow,
          recipientIds: JSON.stringify(kitchenDuty.assignments.map(a => a.studentId))
        }
      })

      return {
        success: true,
        message: 'Daily notification sent successfully',
        notification: {
          date: dateStr,
          teamLead: teamLead?.name,
          teamMembers: teamMembers.map(m => m.name),
          message
        }
      }

    } catch (error) {
      console.error('Error sending daily notification:', error)
      return {
        success: false,
        message: 'Failed to send daily notification'
      }
    }
  }

  /**
   * Get today's kitchen team
   */
  async getTodayTeam(): Promise<any> {
    const today = this.getTodayDate()
    
    return await db.kitchenDuty.findUnique({
      where: { date: today },
      include: {
        teamLead: true,
        assignments: {
          include: { student: true }
        }
      }
    })
  }

  /**
   * Get tomorrow's kitchen team
   */
  async getTomorrowTeam(): Promise<any> {
    const tomorrow = this.getTomorrowDate()
    
    return await db.kitchenDuty.findUnique({
      where: { date: tomorrow },
      include: {
        teamLead: true,
        assignments: {
          include: { student: true }
        }
      }
    })
  }

  /**
   * Get kitchen history
   */
  async getHistory(days: number = 30): Promise<any[]> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    return await db.kitchenHistory.findMany({
      where: {
        date: { gte: startDate }
      },
      include: {
        teamLead: true
      },
      orderBy: { date: 'desc' }
    })
  }

  /**
   * Admin: Edit historical assignment
   */
  async editHistoryAssignment(
    date: Date, 
    teamLeadId: string, 
    teamMemberIds: string[], 
    adminId: string,
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const dateMidnight = new Date(date)
      dateMidnight.setHours(0, 0, 0, 0)

      // Update history
      await db.kitchenHistory.update({
        where: { date: dateMidnight },
        data: {
          teamLeadId,
          teamMembers: JSON.stringify(teamMemberIds),
          status: 'modified',
          modifiedAt: new Date(),
          modifiedBy: adminId,
          notes
        }
      })

      // Also update current/future assignments if they exist
      const existingDuty = await db.kitchenDuty.findUnique({
        where: { date: dateMidnight }
      })

      if (existingDuty) {
        // Delete old assignments
        await db.dutyAssignment.deleteMany({
          where: { kitchenDutyId: existingDuty.id }
        })

        // Create new assignments
        await db.dutyAssignment.createMany({
          data: [
            { studentId: teamLeadId, kitchenDutyId: existingDuty.id, isTeamLead: true },
            ...teamMemberIds.map(memberId => ({
              studentId: memberId,
              kitchenDutyId: existingDuty.id,
              isTeamLead: false
            }))
          ]
        })

        // Update team lead
        await db.kitchenDuty.update({
          where: { id: existingDuty.id },
          data: { teamLeadId }
        })
      }

      return {
        success: true,
        message: 'Assignment updated successfully'
      }

    } catch (error) {
      console.error('Error editing history:', error)
      return {
        success: false,
        message: 'Failed to edit assignment'
      }
    }
  }

  /**
   * Get current cutoff status
   */
  getCutoffStatus(): {
    isBeforeCutoff: boolean
    cutoffTime: string
    currentTime: string
    timeUntilCutoff: string | null
  } {
    const now = new Date()
    const cutoff = new Date(now)
    cutoff.setHours(this.CUTOFF_TIME, 0, 0, 0)
    
    const isBefore = this.isBeforeCutoff(now)
    let timeUntil = null
    
    if (isBefore) {
      const diff = cutoff.getTime() - now.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      timeUntil = `${hours}h ${minutes}m`
    }

    return {
      isBeforeCutoff: isBefore,
      cutoffTime: cutoff.toLocaleTimeString(),
      currentTime: now.toLocaleTimeString(),
      timeUntilCutoff: timeUntil
    }
  }
}