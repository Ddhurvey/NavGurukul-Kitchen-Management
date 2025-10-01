import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    console.log('Starting kitchen history sync...')
    
    // Get all kitchen duties
    const kitchenDuties = await db.kitchenDuty.findMany({
      include: {
        teamLeader: {
          select: { id: true, name: true, email: true }
        },
        member2: {
          select: { id: true, name: true, email: true }
        },
        member3: {
          select: { id: true, name: true, email: true }
        },
        member4: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    console.log(`Found ${kitchenDuties.length} kitchen duties to process`)

    let syncedCount = 0
    let updatedCount = 0

    for (const duty of kitchenDuties) {
      try {
        // Check if history record exists
        const existingHistory = await db.kitchenHistory.findUnique({
          where: { date: duty.date }
        })

        const teamName = `Team ${duty.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

        if (existingHistory) {
          // Update existing history record
          await db.kitchenHistory.update({
            where: { date: duty.date },
            data: {
              teamName,
              teamLeaderId: duty.teamLeaderId,
              member2Id: duty.member2Id,
              member3Id: duty.member3Id,
              member4Id: duty.member4Id,
              teamLeaderName: duty.teamLeader?.name,
              member2Name: duty.member2?.name,
              member3Name: duty.member3?.name,
              member4Name: duty.member4?.name,
              breakfast: duty.breakfast,
              lunch: duty.lunch,
              snacks: duty.snacks,
              dinner: duty.dinner,
              isCompleted: duty.isCompleted,
              notes: existingHistory.notes || `Synced from kitchen duty on ${new Date().toLocaleDateString()}`
            }
          })
          updatedCount++
          console.log(`Updated history for ${duty.date}`)
        } else {
          // Create new history record
          await db.kitchenHistory.create({
            data: {
              date: duty.date,
              teamName,
              teamLeaderId: duty.teamLeaderId,
              member2Id: duty.member2Id,
              member3Id: duty.member3Id,
              member4Id: duty.member4Id,
              teamLeaderName: duty.teamLeader?.name,
              member2Name: duty.member2?.name,
              member3Name: duty.member3?.name,
              member4Name: duty.member4?.name,
              breakfast: duty.breakfast,
              lunch: duty.lunch,
              snacks: duty.snacks,
              dinner: duty.dinner,
              isCompleted: duty.isCompleted,
              notes: `Auto-synced from kitchen duty on ${new Date().toLocaleDateString()}`
            }
          })
          syncedCount++
          console.log(`Created new history for ${duty.date}`)
        }
      } catch (error) {
        console.error(`Error processing duty for ${duty.date}:`, error)
      }
    }

    // Now verify student duty counts are correct
    const students = await db.student.findMany({
      where: { workType: 'KITCHEN' },
      include: {
        assignedDuties: true
      }
    })

    let studentCountUpdates = 0

    for (const student of students) {
      const actualDutyCount = student.assignedDuties.length

      if (student.totalDuties !== actualDutyCount) {
        await db.student.update({
          where: { id: student.id },
          data: { totalDuties: actualDutyCount }
        })
        studentCountUpdates++
        console.log(`Updated ${student.name} duty count from ${student.totalDuties} to ${actualDutyCount}`)
      }
    }

    console.log('Sync completed successfully!')

    return NextResponse.json({
      message: 'Kitchen history sync completed successfully',
      stats: {
        totalDutiesProcessed: kitchenDuties.length,
        newHistoryRecordsCreated: syncedCount,
        existingHistoryRecordsUpdated: updatedCount,
        studentCountsUpdated: studentCountUpdates,
        totalStudents: students.length
      }
    })

  } catch (error) {
    console.error('Error syncing kitchen history:', error)
    return NextResponse.json({ 
      error: 'Failed to sync kitchen history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Get current sync status
    const totalDuties = await db.kitchenDuty.count()
    const totalHistory = await db.kitchenHistory.count()
    
    const unsyncedDuties = await db.kitchenDuty.findMany({
      where: {
        NOT: {
          date: {
            in: (await db.kitchenHistory.findMany({
              select: { date: true }
            })).map(h => h.date)
          }
        }
      },
      select: { date: true, teamLeaderId: true },
      take: 10
    })

    const studentsWithWrongCounts = await db.student.findMany({
      where: {
        workType: 'KITCHEN'
      },
      include: {
        assignedDuties: true
      }
    }).then(students => 
      students.filter(s => s.totalDuties !== s.assignedDuties.length)
    )

    return NextResponse.json({
      syncStatus: {
        totalKitchenDuties: totalDuties,
        totalHistoryRecords: totalHistory,
        unsyncedDutiesCount: unsyncedDuties.length,
        studentsWithWrongCounts: studentsWithWrongCounts.length,
        needsSync: unsyncedDuties.length > 0 || studentsWithWrongCounts.length > 0
      },
      sampleUnsyncedDuties: unsyncedDuties,
      sampleWrongCountStudents: studentsWithWrongCounts.slice(0, 5).map(s => ({
        id: s.id,
        name: s.name,
        recordedCount: s.totalDuties,
        actualCount: s.assignedDuties.length
      }))
    })

  } catch (error) {
    console.error('Error checking sync status:', error)
    return NextResponse.json({ 
      error: 'Failed to check sync status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}