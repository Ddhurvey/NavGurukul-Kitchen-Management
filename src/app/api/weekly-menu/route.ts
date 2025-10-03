import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getWeekNumber, getStartOfWeek, getEndOfWeek } from '@/lib/utils';

// GET current week's menu or specific week
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get('week');
    const yearParam = searchParams.get('year');
    
    const now = new Date();
    const weekNumber = weekParam ? parseInt(weekParam) : getWeekNumber(now);
    const year = yearParam ? parseInt(yearParam) : now.getFullYear();
    
    // Find weekly menu
    const weeklyMenu = await db.weeklyMenu.findUnique({
      where: {
        weekNumber_year: {
          weekNumber,
          year
        }
      },
      include: {
        dailyMenus: {
          orderBy: {
            date: 'asc'
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approvedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!weeklyMenu) {
      // Return empty weekly menu structure
      const startDate = getStartOfWeek(now);
      const endDate = getEndOfWeek(now);
      
      return NextResponse.json({
        weekNumber,
        year,
        startDate,
        endDate,
        status: 'DRAFT',
        dailyMenus: [],
        message: 'No weekly menu found for this week'
      });
    }
    
    return NextResponse.json(weeklyMenu);
  } catch (error) {
    console.error('Error fetching weekly menu:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly menu' },
      { status: 500 }
    );
  }
}

// POST create new weekly menu
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { weekNumber, year, createdBy, dailyMenus } = body;
    
    // Validate required fields
    if (!weekNumber || !year || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields: weekNumber, year, createdBy' },
        { status: 400 }
      );
    }
    
    // Check if weekly menu already exists
    const existingMenu = await db.weeklyMenu.findUnique({
      where: {
        weekNumber_year: {
          weekNumber,
          year
        }
      }
    });
    
    if (existingMenu) {
      return NextResponse.json(
        { error: 'Weekly menu already exists for this week' },
        { status: 400 }
      );
    }
    
    const now = new Date();
    const startDate = getStartOfWeek(now);
    const endDate = getEndOfWeek(now);
    
    // Create weekly menu
    const weeklyMenu = await db.weeklyMenu.create({
      data: {
        weekNumber,
        year,
        startDate,
        endDate,
        createdBy,
        status: 'DRAFT'
      }
    });
    
    // Create daily menus if provided
    if (dailyMenus && dailyMenus.length > 0) {
      try {
        await Promise.all(
          dailyMenus.map(async (menu: any) => {
            // Validate each menu item
            if (!menu.date) {
              throw new Error('Menu date is required');
            }
            
            await db.foodMenu.create({
              data: {
                date: new Date(menu.date),
                breakfast: menu.breakfast || '',
                lunch: menu.lunch || '',
                snacks: menu.snacks || '',
                dinner: menu.dinner || '',
                mainDish: menu.mainDish || '',
                dishType: menu.dishType || 'VEG',
                updatedBy: createdBy,
                isWeeklyMenu: true,
                weekNumber,
                weeklyMenuId: weeklyMenu.id
              }
            });
          })
        );
      } catch (menuError) {
        console.error('Error creating daily menus:', menuError);
        // Rollback weekly menu creation if daily menus fail
        await db.weeklyMenu.delete({
          where: { id: weeklyMenu.id }
        });
        return NextResponse.json(
          { error: 'Failed to create daily menus: ' + (menuError instanceof Error ? menuError.message : 'Unknown error') },
          { status: 500 }
        );
      }
    }
    
    // Fetch the complete weekly menu
    const completeWeeklyMenu = await db.weeklyMenu.findUnique({
      where: { id: weeklyMenu.id },
      include: {
        dailyMenus: {
          orderBy: {
            date: 'asc'
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    return NextResponse.json(completeWeeklyMenu, { status: 201 });
  } catch (error) {
    console.error('Error creating weekly menu:', error);
    return NextResponse.json(
      { error: 'Failed to create weekly menu' },
      { status: 500 }
    );
  }
}

// PUT update weekly menu
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, approvedBy, dailyMenus } = body;
    
    // Update weekly menu
    const updateData: any = {};
    if (status) updateData.status = status;
    if (approvedBy && status === 'APPROVED') {
      updateData.approvedBy = approvedBy;
      updateData.approvedAt = new Date();
    }
    
    const weeklyMenu = await db.weeklyMenu.update({
      where: { id },
      data: updateData,
      include: {
        dailyMenus: {
          orderBy: {
            date: 'asc'
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approvedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Update daily menus if provided
    if (dailyMenus && dailyMenus.length > 0) {
      await Promise.all(
        dailyMenus.map(async (menu: any) => {
          if (menu.id) {
            // Update existing menu
            await db.foodMenu.update({
              where: { id: menu.id },
              data: {
                breakfast: menu.breakfast,
                lunch: menu.lunch,
                snacks: menu.snacks,
                dinner: menu.dinner,
                mainDish: menu.mainDish,
                dishType: menu.dishType
              }
            });
          } else {
            // Create new menu
            await db.foodMenu.create({
              data: {
                date: new Date(menu.date),
                breakfast: menu.breakfast,
                lunch: menu.lunch,
                snacks: menu.snacks,
                dinner: menu.dinner,
                mainDish: menu.mainDish,
                dishType: menu.dishType,
                updatedBy: weeklyMenu.createdBy,
                isWeeklyMenu: true,
                weekNumber: weeklyMenu.weekNumber,
                weeklyMenuId: weeklyMenu.id
              }
            });
          }
        })
      );
    }
    
    return NextResponse.json(weeklyMenu);
  } catch (error) {
    console.error('Error updating weekly menu:', error);
    return NextResponse.json(
      { error: 'Failed to update weekly menu' },
      { status: 500 }
    );
  }
}