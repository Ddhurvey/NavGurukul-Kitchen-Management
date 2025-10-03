import { NextRequest, NextResponse } from 'next/server';
import { RotationService } from '@/lib/rotation-service';
import { db } from '@/lib/db';

// GET all leave requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const status = searchParams.get('status');
    
    const where: any = {};
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;
    
    const leaveRequests = await db.leaveRequest.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            foodPreference: true
          }
        },
        replacementStudent: {
          select: {
            id: true,
            name: true,
            email: true,
            foodPreference: true
          }
        },
        processedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { requestTime: 'desc' }
    });
    
    return NextResponse.json(leaveRequests);
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leave requests' },
      { status: 500 }
    );
  }
}

// POST create new leave request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, date, reason, notes } = body;
    
    if (!studentId || !date || !reason) {
      return NextResponse.json(
        { error: 'Student ID, date, and reason are required' },
        { status: 400 }
      );
    }

    // Check if student is assigned to kitchen on this date
    const kitchenTurn = await db.kitchenTurn.findUnique({
      where: { date: new Date(date) },
      include: {
        assignedStudents: true
      }
    });

    if (!kitchenTurn) {
      return NextResponse.json(
        { error: 'No kitchen assignment found for this date' },
        { status: 404 }
      );
    }

    const isAssigned = kitchenTurn.assignedStudents.some(
      assignment => assignment.studentId === studentId
    );

    if (!isAssigned) {
      return NextResponse.json(
        { error: 'Student is not assigned to kitchen duty on this date' },
        { status: 400 }
      );
    }

    // Create leave request
    const leaveRequest = await db.leaveRequest.create({
      data: {
        studentId,
        date: new Date(date),
        reason,
        notes: notes || null
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            foodPreference: true
          }
        }
      }
    });

    // Auto-process the leave request
    const processResult = await RotationService.processLeaveRequest(leaveRequest.id);
    
    // Get updated leave request with details
    const updatedRequest = await db.leaveRequest.findUnique({
      where: { id: leaveRequest.id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            foodPreference: true
          }
        },
        replacementStudent: {
          select: {
            id: true,
            name: true,
            email: true,
            foodPreference: true
          }
        }
      }
    });

    return NextResponse.json({
      leaveRequest: updatedRequest,
      processResult
    });
  } catch (error) {
    console.error('Error creating leave request:', error);
    return NextResponse.json(
      { error: 'Failed to create leave request' },
      { status: 500 }
    );
  }
}