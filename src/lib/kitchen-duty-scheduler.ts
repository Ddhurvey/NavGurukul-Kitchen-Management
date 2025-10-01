import { db } from '@/lib/db'

interface Student {
  id: string
  name: string
  email: string
  foodPreference: string
  isActive: boolean
  isPresent: boolean
  isTeamMember: boolean
  isJobPlaced: boolean
  profileClosed: boolean
}

interface DutyRotationState {
  currentCycle: number
  currentDayInCycle: number
  lastAssignedIndex: number
  studentQueue: string[]
}

interface AssignmentResult {
  success: boolean
  teamLead?: Student
  teamMembers?: Student[]
  cycleNumber?: number
  dayInCycle?: number
  isSundaySpecial?: boolean
  error?: string
}

export class KitchenDutyScheduler {
  private readonly CYCLE_LENGTH = 7 // 7 days cycle
  private readonly TEAM_SIZE = 4 // 4 people per team
  
  /**
   * Get or initialize the duty rotation state
   */
  private async getRotationState(): Promise<DutyRotationState> {
    let rotation = await db.dutyRotation.findFirst({
      where: { isActive: true }
    })

    if (!rotation) {
      // Initialize rotation with eligible students
      const eligibleStudents = await this.getEligibleStudents()
      const studentQueue = eligibleStudents.map(s => s.id)
      
      rotation = await db.dutyRotation.create({
        data: {
          currentCycle: 1,
          currentDayInCycle: 1,
          lastAssignedIndex: -1, // Start before first student
          studentQueue: JSON.stringify(studentQueue),
          isActive: true
        }
      })
    }

    return {
      currentCycle: rotation.currentCycle,
      currentDayInCycle: rotation.currentDayInCycle,
      lastAssignedIndex: rotation.lastAssignedIndex,
      studentQueue: JSON.parse(rotation.studentQueue)
    }
  }

  /**
   * Update the rotation state after assignment
   */
  private async updateRotationState(state: DutyRotationState): Promise<void> {
    await db.dutyRotation.updateMany({
      where: { isActive: true },
      data: {
        currentCycle: state.currentCycle,
        currentDayInCycle: state.currentDayInCycle,
        lastAssignedIndex: state.lastAssignedIndex,
        studentQueue: JSON.stringify(state.studentQueue),
        updatedAt: new Date()
      }
    })
  }

  /**
   * Get eligible students for duty
   */
  private async getEligibleStudents(): Promise<Student[]> {
    const students = await db.student.findMany({
      where: {
        isActive: true,
        isPresent: true,
        isTeamMember: false,
        isJobPlaced: false,
        profileClosed: false
      },
      orderBy: { name: 'asc' }
    })

    return students
  }

  /**
   * Check if a date is Sunday
   */
  private isSunday(date: Date): boolean {
    return date.getDay() === 0 // 0 = Sunday
  }

  /**
   * Get students by food preference
   */
  private getStudentsByPreference(students: Student[], preference: string): Student[] {
    return students.filter(s => s.foodPreference.toLowerCase() === preference.toLowerCase())
  }

  /**
   * Assign kitchen duty for a specific date using round-robin algorithm
   */
  async assignDuty(date: Date): Promise<AssignmentResult> {
    try {
      const state = await this.getRotationState()
      const eligibleStudents = await this.getEligibleStudents()
      
      if (eligibleStudents.length === 0) {
        return { success: false, error: 'No eligible students available for duty' }
      }

      const isSunday = this.isSunday(date)
      let teamLead: Student
      let teamMembers: Student[]

      if (isSunday) {
        // Sunday special rule: need at least 1 egg and 1 paneer preference
        const result = await this.assignSundaySpecial(eligibleStudents, state)
        if (!result.success) return result
        
        teamLead = result.teamLead!
        teamMembers = result.teamMembers!
      } else {
        // Regular weekday assignment
        const result = await this.assignWeekdayDuty(eligibleStudents, state)
        if (!result.success) return result
        
        teamLead = result.teamLead!
        teamMembers = result.teamMembers!
      }

      // Update rotation state
      await this.updateRotationState(state)

      // Create kitchen duty record
      const kitchenDuty = await db.kitchenDuty.create({
        data: {
          date,
          cycleNumber: state.currentCycle,
          dayInCycle: state.currentDayInCycle,
          isSundaySpecial: isSunday,
          teamLeadId: teamLead.id,
          assignments: {
            create: [
              { studentId: teamLead.id, isTeamLead: true },
              ...teamMembers.map(member => ({ studentId: member.id, isTeamLead: false }))
            ]
          }
        },
        include: {
          assignments: { include: { student: true } },
          teamLead: true
        }
      })

      return {
        success: true,
        teamLead,
        teamMembers,
        cycleNumber: state.currentCycle,
        dayInCycle: state.currentDayInCycle,
        isSundaySpecial: isSunday
      }

    } catch (error) {
      console.error('Error assigning duty:', error)
      return { success: false, error: 'Failed to assign kitchen duty' }
    }
  }

  /**
   * Assign duty for regular weekdays (4 people team)
   */
  private async assignWeekdayDuty(
    eligibleStudents: Student[], 
    state: DutyRotationState
  ): Promise<AssignmentResult> {
    // Get next 4 students in rotation for team
    const teamMembers: Student[] = []
    let teamLead: Student
    let nextIndex = state.lastAssignedIndex
    
    // Assign 4 people to the team
    for (let i = 0; i < this.TEAM_SIZE; i++) {
      nextIndex = (nextIndex + 1) % eligibleStudents.length
      const assignedStudent = eligibleStudents[nextIndex]
      
      if (i === 0) {
        teamLead = assignedStudent // First person is team lead
      } else {
        teamMembers.push(assignedStudent)
      }
    }
    
    // Update state
    state.lastAssignedIndex = nextIndex
    state.currentDayInCycle++
    
    // Check if cycle is complete
    if (state.currentDayInCycle > this.CYCLE_LENGTH) {
      state.currentCycle++
      state.currentDayInCycle = 1
    }

    return {
      success: true,
      teamLead: teamLead!,
      teamMembers,
      cycleNumber: state.currentCycle,
      dayInCycle: state.currentDayInCycle,
      isSundaySpecial: false
    }
  }

  /**
   * Assign duty for Sunday with special egg/paneer requirements (4 people team)
   */
  private async assignSundaySpecial(
    eligibleStudents: Student[], 
    state: DutyRotationState
  ): Promise<AssignmentResult> {
    const eggStudents = this.getStudentsByPreference(eligibleStudents, 'egg')
    const paneerStudents = this.getStudentsByPreference(eligibleStudents, 'paneer')

    if (eggStudents.length === 0) {
      return { success: false, error: 'No students with egg preference available for Sunday duty' }
    }
    if (paneerStudents.length === 0) {
      return { success: false, error: 'No students with paneer preference available for Sunday duty' }
    }

    // Build team of 4 with egg and paneer requirements
    const teamMembers: Student[] = []
    let teamLead: Student
    let nextIndex = state.lastAssignedIndex
    
    // First, ensure we have at least one egg and one paneer student
    let selectedEggStudent = eggStudents[0]
    let selectedPaneerStudent = paneerStudents.find(s => s.id !== selectedEggStudent.id) || paneerStudents[0]
    
    // Assign 4 people to the team
    const assignedStudents: Student[] = []
    
    for (let i = 0; i < this.TEAM_SIZE; i++) {
      nextIndex = (nextIndex + 1) % eligibleStudents.length
      let assignedStudent = eligibleStudents[nextIndex]
      
      // For first 2 positions, prioritize egg and paneer requirements
      if (i === 0 && !assignedStudents.find(s => s.id === selectedEggStudent.id)) {
        assignedStudent = selectedEggStudent
        nextIndex = eligibleStudents.findIndex(s => s.id === selectedEggStudent.id)
      } else if (i === 1 && !assignedStudents.find(s => s.id === selectedPaneerStudent.id)) {
        assignedStudent = selectedPaneerStudent
        nextIndex = eligibleStudents.findIndex(s => s.id === selectedPaneerStudent.id)
      }
      
      // Avoid duplicates
      if (!assignedStudents.find(s => s.id === assignedStudent.id)) {
        assignedStudents.push(assignedStudent)
      } else {
        i-- // Try again for next student
      }
    }
    
    // First person is team lead
    teamLead = assignedStudents[0]
    teamMembers.push(...assignedStudents.slice(1))
    
    // Update rotation state
    state.lastAssignedIndex = nextIndex
    state.currentDayInCycle++
    
    // Check if cycle is complete
    if (state.currentDayInCycle > this.CYCLE_LENGTH) {
      state.currentCycle++
      state.currentDayInCycle = 1
    }

    return {
      success: true,
      teamLead,
      teamMembers,
      cycleNumber: state.currentCycle,
      dayInCycle: state.currentDayInCycle,
      isSundaySpecial: true
    }
  }

  /**
   * Get current rotation status
   */
  async getRotationStatus(): Promise<any> {
    const state = await this.getRotationState()
    const eligibleStudents = await this.getEligibleStudents()
    
    return {
      currentCycle: state.currentCycle,
      currentDayInCycle: state.currentDayInCycle,
      totalEligibleStudents: eligibleStudents.length,
      lastAssignedIndex: state.lastAssignedIndex,
      cycleProgress: Math.round((state.currentDayInCycle / this.CYCLE_LENGTH) * 100)
    }
  }

  /**
   * Reset rotation (for testing or manual intervention)
   */
  async resetRotation(): Promise<void> {
    await db.dutyRotation.updateMany({
      where: { isActive: true },
      data: {
        currentCycle: 1,
        currentDayInCycle: 1,
        lastAssignedIndex: -1,
        updatedAt: new Date()
      }
    })
  }
}