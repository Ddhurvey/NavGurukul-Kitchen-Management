import { NextRequest, NextResponse } from 'next/server';
import { RotationService } from '@/lib/rotation-service';

// GET current rotation groups
export async function GET() {
  try {
    const groups = await RotationService.getRotationGroups();
    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error fetching rotation groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rotation groups' },
      { status: 500 }
    );
  }
}

// POST initialize rotation groups
export async function POST() {
  try {
    const groups = await RotationService.initializeRotationGroups();
    return NextResponse.json({ 
      message: 'Rotation groups initialized successfully',
      groups 
    });
  } catch (error) {
    console.error('Error initializing rotation groups:', error);
    return NextResponse.json(
      { error: 'Failed to initialize rotation groups' },
      { status: 500 }
    );
  }
}