import { db } from '@/lib/db';
import { getStartOfWeek, getEndOfWeek, addDays } from '@/lib/utils';

export interface RotationGroup {
  groupId: number;
  students: Array<{
    id: string;
    name: string;
    email: string;
    foodPreference: string;
    rotationPosition: number;
  }>;
}

export interface KitchenAssignment {
  date: Date;
  groupId: number;
  students: string[];
  isSunday: boolean;
  teamLeaderId: string;
}

export class RotationService {
  /**
   * Initialize rotation groups for students (4 students per group)
   */
  static async initializeRotationGroups(): Promise<RotationGroup[]> {
    const activeStudents = await db.user.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' }
    });

    const groups: RotationGroup[] = [];
    const groupSize = 4;

    // Create groups of 4 students each
    for (let i = 0; i < activeStudents.length; i += groupSize) {
      const groupStudents = activeStudents.slice(i, i + groupSize);
      
      // Update rotation group for each student
      await Promise.all(
        groupStudents.map((student, index) =>
          db.user.update({
            where: { id: student.id },
            data: {
              rotationGroup: Math.floor(i / groupSize),
              rotationPosition: index
            }
          })
        )
      );

      groups.push({
        groupId: Math.floor(i / groupSize),
        students: groupStudents.map(student => ({
          id: student.id,
          name: student.name,
          email: student.email,
          foodPreference: student.foodPreference,
          rotationPosition: student.rotationPosition
        }))
      });
    }

    return groups;
  }

  /**
   * Get current rotation groups
   */
  static async getRotationGroups(): Promise<RotationGroup[]> {
    const activeStudents = await db.user.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [
        { rotationGroup: 'asc' },
        { rotationPosition: 'asc' }
      ]
    });

    const groupsMap = new Map<number, RotationGroup['students']>();

    activeStudents.forEach(student => {
      const groupId = student.rotationGroup;
      if (!groupsMap.has(groupId)) {
        groupsMap.set(groupId, []);
      }
      groupsMap.get(groupId)!.push({
        id: student.id,
        name: student.name,
        email: student.email,
        foodPreference: student.foodPreference,
        rotationPosition: student.rotationPosition
      });
    });

    return Array.from(groupsMap.entries()).map(([groupId, students]) => ({
      groupId,
      students
    }));
  }

  /**
   * Get kitchen assignment for a specific date
   */
  static async getKitchenAssignment(date: Date): Promise<KitchenAssignment | null> {
    const existingAssignment = await db.kitchenTurn.findUnique({
      where: { date },
      include: {
        assignedStudents: {
          include: {
            student: true
          }
        },
        teamLeader: true
      }
    });

    if (existingAssignment) {
      return {
        date: existingAssignment.date,
        groupId: existingAssignment.rotationGroupId || 0,
        students: existingAssignment.assignedStudents.map(a => a.studentId),
        isSunday: existingAssignment.isSundayTeam,
        teamLeaderId: existingAssignment.teamLeaderId || existingAssignment.assignedStudents[0]?.studentId
      };
    }

    return null;
  }

  /**
   * Create kitchen assignment for a specific date following rotation rules
   */
  static async createKitchenAssignment(date: Date, forceSunday = false): Promise<KitchenAssignment> {
    const isSunday = date.getDay() === 0 || forceSunday;
    const groups = await this.getRotationGroups();
    
    if (groups.length === 0) {
      throw new Error('No active students found for rotation');
    }

    // Check if assignment already exists
    const existingAssignment = await this.getKitchenAssignment(date);
    if (existingAssignment && existingAssignment.students.length > 0) {
      return existingAssignment;
    }

    // Get approved leave requests for this date
    const approvedLeaveRequests = await db.leaveRequest.findMany({
      where: {
        date: date,
        status: {
          in: ['APPROVED', 'PROCESSED']
        }
      },
      select: {
        studentId: true
      }
    });

    const leaveStudentIds = new Set(approvedLeaveRequests.map(lr => lr.studentId));

    // Get existing assignments to determine rotation
    const existingAssignments = await db.kitchenTurn.findMany({
      where: {
        date: {
          lt: date
        }
      },
      orderBy: { date: 'desc' },
      take: groups.length * 2 // Get enough history to determine rotation
    });

    // Determine next group in rotation
    let nextGroupId = 0;
    if (existingAssignments.length > 0) {
      const lastAssignment = existingAssignments[0];
      nextGroupId = (lastAssignment.rotationGroupId! + 1) % groups.length;
    }

    let selectedGroup = groups[nextGroupId];
    
    // For Sunday, ensure we have at least 1 egg student
    if (isSunday) {
      selectedGroup = await this.ensureSundayRequirement(groups, nextGroupId, leaveStudentIds);
    }

    // Filter out students on leave
    const availableStudents = selectedGroup.students.filter(
      student => !leaveStudentIds.has(student.id)
    );

    // If not enough students available, find replacements
    let finalStudents = availableStudents;
    if (availableStudents.length < 4) {
      finalStudents = await this.findReplacementStudents(groups, availableStudents, leaveStudentIds, 4);
    }

    const teamLeaderId = finalStudents[0]?.id;
    
    // Create or update kitchen turn
    let kitchenTurn;
    if (existingAssignment) {
      // Update existing empty turn
      kitchenTurn = await db.kitchenTurn.update({
        where: { date },
        data: {
          teamLeaderId,
          rotationGroupId: nextGroupId,
          isSundayTeam: isSunday,
          status: 'PENDING'
        }
      });
    } else {
      // Create new kitchen turn
      kitchenTurn = await db.kitchenTurn.create({
        data: {
          date,
          teamLeaderId,
          rotationGroupId: nextGroupId,
          isSundayTeam: isSunday,
          status: 'PENDING'
        }
      });
    }

    // Remove any existing student assignments and create new ones
    if (existingAssignment) {
      await db.kitchenTurnStudent.deleteMany({
        where: { kitchenTurnId: kitchenTurn.id }
      });
    }

    // Assign students to kitchen turn
    await Promise.all(
      finalStudents.map(student =>
        db.kitchenTurnStudent.create({
          data: {
            kitchenTurnId: kitchenTurn.id,
            studentId: student.id
          }
        })
      )
    );

    // Update student turn counts
    await Promise.all(
      finalStudents.map(student =>
        db.user.update({
          where: { id: student.id },
          data: {
            totalKitchenTurns: { increment: 1 },
            lastTurnDate: date
          }
        })
      )
    );

    return {
      date,
      groupId: nextGroupId,
      students: finalStudents.map(s => s.id),
      isSunday,
      teamLeaderId
    };
  }

  /**
   * Ensure Sunday team has at least 1 egg student
   */
  private static async ensureSundayRequirement(groups: RotationGroup[], preferredGroupId: number, leaveStudentIds: Set<string>): Promise<RotationGroup> {
    const preferredGroup = groups[preferredGroupId];
    const availablePreferredStudents = preferredGroup.students.filter(s => !leaveStudentIds.has(s.id));
    const hasEggStudent = availablePreferredStudents.some(s => s.foodPreference === 'EGGS');

    if (hasEggStudent) {
      return {
        groupId: preferredGroupId,
        students: availablePreferredStudents
      };
    }

    // Find a group with egg students (excluding students on leave)
    const groupWithEggsIndex = groups.findIndex(group => 
      group.students.some(s => s.foodPreference === 'EGGS' && !leaveStudentIds.has(s.id))
    );

    if (groupWithEggsIndex !== -1) {
      const groupWithEggs = groups[groupWithEggsIndex];
      return {
        groupId: groupWithEggsIndex,
        students: groupWithEggs.students.filter(s => !leaveStudentIds.has(s.id))
      };
    }

    // If no group has egg students available, return preferred group's available students
    console.warn('No egg students available for Sunday team');
    return {
      groupId: preferredGroupId,
      students: availablePreferredStudents
    };
  }

  /**
   * Find replacement students from other groups
   */
  private static async findReplacementStudents(
    groups: RotationGroup[], 
    currentStudents: RotationGroup['students'], 
    leaveStudentIds: Set<string>,
    requiredCount: number
  ): Promise<RotationGroup['students']> {
    const replacements: RotationGroup['students'] = [];
    const usedStudentIds = new Set([...currentStudents.map(s => s.id), ...leaveStudentIds]);

    // Search through all groups to find available students
    for (const group of groups) {
      for (const student of group.students) {
        if (!usedStudentIds.has(student.id)) {
          replacements.push(student);
          usedStudentIds.add(student.id);
          
          if (replacements.length + currentStudents.length >= requiredCount) {
            return [...currentStudents, ...replacements];
          }
        }
      }
    }

    return [...currentStudents, ...replacements];
  }

  /**
   * Create weekly kitchen assignments
   */
  static async createWeeklyAssignments(weekStart: Date): Promise<KitchenAssignment[]> {
    const assignments: KitchenAssignment[] = [];
    const weekEnd = addDays(weekStart, 6);

    for (let date = weekStart; date <= weekEnd; date = addDays(date, 1)) {
      const existingAssignment = await this.getKitchenAssignment(date);
      
      if (!existingAssignment) {
        const assignment = await this.createKitchenAssignment(date);
        assignments.push(assignment);
      } else {
        assignments.push(existingAssignment);
      }
    }

    return assignments;
  }

  /**
   * Process leave request with 9 PM cutoff rule
   */
  static async processLeaveRequest(leaveRequestId: string): Promise<{
    success: boolean;
    message: string;
    replacementStudent?: any;
  }> {
    const leaveRequest = await db.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        student: true
      }
    });

    if (!leaveRequest) {
      return { success: false, message: 'Leave request not found' };
    }

    const requestTime = leaveRequest.requestTime;
    const dutyDate = leaveRequest.date;
    const cutoffTime = new Date(dutyDate);
    cutoffTime.setHours(21, 0, 0, 0); // 9 PM on duty day

    const isBeforeCutoff = requestTime < cutoffTime;

    if (isBeforeCutoff) {
      // Auto-replace with next available student
      const replacement = await this.findReplacementStudent(leaveRequest.date, leaveRequest.studentId);
      
      if (replacement) {
        await db.leaveRequest.update({
          where: { id: leaveRequestId },
          data: {
            status: 'PROCESSED',
            processedAt: new Date(),
            replacementStudentId: replacement.id,
            autoReplaced: true
          }
        });

        // Update kitchen turn assignment
        await this.updateKitchenTurnAssignment(leaveRequest.date, leaveRequest.studentId, replacement.id);

        return { 
          success: true, 
          message: 'Leave approved and replacement assigned automatically',
          replacementStudent: replacement
        };
      } else {
        return { success: false, message: 'No replacement student available' };
      }
    } else {
      // After 9 PM - no changes to team
      await db.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          status: 'APPROVED',
          processedAt: new Date(),
          autoReplaced: false
        }
      });

      return { 
        success: true, 
        message: 'Leave approved but team remains unchanged (requested after 9 PM cutoff)'
      };
    }
  }

  /**
   * Find replacement student from next rotation group
   */
  private static async findReplacementStudent(dutyDate: Date, excludeStudentId: string): Promise<any> {
    const currentAssignment = await this.getKitchenAssignment(dutyDate);
    if (!currentAssignment) return null;

    const groups = await this.getRotationGroups();
    const currentGroup = groups[currentAssignment.groupId];
    
    // Find next group that has available students
    for (let i = 1; i < groups.length; i++) {
      const nextGroupId = (currentAssignment.groupId + i) % groups.length;
      const nextGroup = groups[nextGroupId];
      
      // Check if any student in this group is not already assigned
      const availableStudent = nextGroup.students.find(student => 
        !currentAssignment.students.includes(student.id) && 
        student.id !== excludeStudentId
      );

      if (availableStudent) {
        return availableStudent;
      }
    }

    return null;
  }

  /**
   * Update kitchen turn assignment with replacement
   */
  private static async updateKitchenTurnAssignment(
    dutyDate: Date, 
    originalStudentId: string, 
    replacementStudentId: string
  ): Promise<void> {
    const kitchenTurn = await db.kitchenTurn.findUnique({
      where: { date: dutyDate }
    });

    if (!kitchenTurn) return;

    // Remove original student and add replacement
    await db.kitchenTurnStudent.deleteMany({
      where: {
        kitchenTurnId: kitchenTurn.id,
        studentId: originalStudentId
      }
    });

    await db.kitchenTurnStudent.create({
      data: {
        kitchenTurnId: kitchenTurn.id,
        studentId: replacementStudentId
      }
    });

    // Record swap history
    await db.swapHistory.create({
      data: {
        originalStudentId,
        replacementStudentId,
        kitchenTurnId: kitchenTurn.id,
        swapReason: 'LEAVE',
        reason: 'Leave request replacement',
        approvedBy: 'SYSTEM_AUTO'
      }
    });

    // Update student turn counts
    await Promise.all([
      db.user.update({
        where: { id: originalStudentId },
        data: { totalKitchenTurns: { decrement: 1 } }
      }),
      db.user.update({
        where: { id: replacementStudentId },
        data: { 
          totalKitchenTurns: { increment: 1 },
          lastTurnDate: dutyDate
        }
      })
    ]);
  }
}