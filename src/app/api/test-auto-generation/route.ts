import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get a sample student who has kitchen duties
    const studentWithDuties = await db.student.findFirst({
      where: {
        workType: 'KITCHEN',
        status: 'ACTIVE'
      },
      include: {
        assignedDuties: {
          include: {
            kitchenHistory: true
          },
          take: 1
        }
      }
    })

    if (!studentWithDuties) {
      return NextResponse.json({ 
        message: 'No kitchen students found',
        students: await db.student.count({ where: { workType: 'KITCHEN' } }),
        activeStudents: await db.student.count({ where: { workType: 'KITCHEN', status: 'ACTIVE' } })
      })
    }

    // Get available active kitchen students
    const availableStudents = await db.student.findMany({
      where: {
        workType: 'KITCHEN',
        status: 'ACTIVE',
        id: { not: studentWithDuties.id }
      },
      orderBy: { totalDuties: 'asc' },
      take: 5
    })

    return NextResponse.json({
      message: 'Auto-generation test data',
      sampleStudent: {
        id: studentWithDuties.id,
        name: studentWithDuties.name,
        totalDuties: studentWithDuties.totalDuties,
        assignedDuties: studentWithDuties.assignedDuties.length
      },
      availableReplacements: availableStudents.map(s => ({
        id: s.id,
        name: s.name,
        totalDuties: s.totalDuties,
        status: s.status
      })),
      totalKitchenStudents: await db.student.count({ where: { workType: 'KITCHEN' } }),
      totalActiveKitchenStudents: await db.student.count({ where: { workType: 'KITCHEN', status: 'ACTIVE' } })
    })

  } catch (error) {
    console.error('Error testing auto-generation:', error)
    return NextResponse.json({ 
      error: 'Failed to test auto-generation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}