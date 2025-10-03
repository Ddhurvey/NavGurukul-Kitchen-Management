import { NextRequest, NextResponse } from 'next/server';
import { RotationService } from '@/lib/rotation-service';
import { db } from '@/lib/db';

// POST process leave request manually
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leaveRequestId, approved } = body;
    
    if (!leaveRequestId) {
      return NextResponse.json(
        { error: 'Leave request ID is required' },
        { status: 400 }
      );
    }

    if (approved) {
      const result = await RotationService.processLeaveRequest(leaveRequestId);
      return NextResponse.json(result);
    } else {
      // Reject the leave request
      await db.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          status: 'REJECTED',
          processedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Leave request rejected'
      });
    }
  } catch (error) {
    console.error('Error processing leave request:', error);
    return NextResponse.json(
      { error: 'Failed to process leave request' },
      { status: 500 }
    );
  }
}