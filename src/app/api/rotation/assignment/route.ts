import { NextRequest, NextResponse } from 'next/server';
import { RotationService } from '@/lib/rotation-service';
import { db } from '@/lib/db';

// GET kitchen assignment for specific date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    
    if (!dateParam) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    const date = new Date(dateParam);
    const assignment = await RotationService.getKitchenAssignment(date);
    
    if (!assignment) {
      return NextResponse.json({ 
        message: 'No assignment found for this date',
        date: dateParam
      });
    }

    // Get full student details
    const assignmentWithDetails = await db.kitchenTurn.findUnique({
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

    return NextResponse.json(assignmentWithDetails);
  } catch (error) {
    console.error('Error fetching kitchen assignment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch kitchen assignment' },
      { status: 500 }
    );
  }
}

// POST create kitchen assignment for specific date
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, forceSunday } = body;
    
    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    const assignmentDate = new Date(date);
    const assignment = await RotationService.createKitchenAssignment(assignmentDate, forceSunday);
    
    return NextResponse.json({ 
      message: 'Kitchen assignment created successfully',
      assignment 
    });
  } catch (error) {
    console.error('Error creating kitchen assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create kitchen assignment' },
      { status: 500 }
    );
  }
}