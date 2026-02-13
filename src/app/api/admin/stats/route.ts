import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, getAdminStats } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

// GET /api/admin/stats - Get admin dashboard statistics
export async function GET() {
  try {
    const adminSession = await getAdminSession();
    
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getAdminStats();
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
