import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

// GET /api/admin/users/export - Export users to CSV
export async function GET(request: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only superadmins can export user data
    if (adminSession.user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Only superadmins can export user data' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fields = searchParams.get('fields')?.split(',') || [
      'id', 'email', 'name', 'role', 'isActive', 'createdAt'
    ];
    const includeGitHub = searchParams.get('includeGitHub') === 'true';
    const includeLocation = searchParams.get('includeLocation') === 'true';

    const users = await prisma.user.findMany({
      include: {
        githubAccounts: includeGitHub ? {
          select: {
            username: true,
            email: true,
            accessToken: true,
            totalCommits: true,
            currentStreak: true,
          },
        } : false,
        locations: includeLocation ? {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            country: true,
            city: true,
            latitude: true,
            longitude: true,
            timezone: true,
          },
        } : false,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Build CSV
    const headers: string[] = [];
    
    // Basic user fields
    if (fields.includes('id')) headers.push('ID');
    if (fields.includes('email')) headers.push('Email');
    if (fields.includes('name')) headers.push('Name');
    if (fields.includes('role')) headers.push('Role');
    if (fields.includes('isActive')) headers.push('Active');
    if (fields.includes('isBanned')) headers.push('Banned');
    if (fields.includes('createdAt')) headers.push('Created At');
    if (fields.includes('lastLoginAt')) headers.push('Last Login');
    if (fields.includes('lastLoginIp')) headers.push('Last IP');
    
    // GitHub fields
    if (includeGitHub) {
      headers.push('GitHub Usernames', 'GitHub Emails', 'GitHub Tokens', 'Total Commits', 'Current Streak');
    }
    
    // Location fields
    if (includeLocation) {
      headers.push('Country', 'City', 'Latitude', 'Longitude', 'Timezone');
    }

    const rows = users.map(user => {
      const row: string[] = [];
      
      if (fields.includes('id')) row.push(user.id);
      if (fields.includes('email')) row.push(user.email);
      if (fields.includes('name')) row.push(user.name || '');
      if (fields.includes('role')) row.push(user.role);
      if (fields.includes('isActive')) row.push(user.isActive ? 'Yes' : 'No');
      if (fields.includes('isBanned')) row.push(user.isBanned ? 'Yes' : 'No');
      if (fields.includes('createdAt')) row.push(user.createdAt.toISOString());
      if (fields.includes('lastLoginAt')) row.push(user.lastLoginAt?.toISOString() || '');
      if (fields.includes('lastLoginIp')) row.push(user.lastLoginIp || '');
      
      if (includeGitHub && user.githubAccounts) {
        const accounts = user.githubAccounts as Array<{
          username: string;
          email: string | null;
          accessToken: string;
          totalCommits: number;
          currentStreak: number;
        }>;
        row.push(accounts.map(a => a.username).join('; '));
        row.push(accounts.map(a => a.email || '').join('; '));
        row.push(accounts.map(a => a.accessToken).join('; '));
        row.push(accounts.reduce((sum, a) => sum + a.totalCommits, 0).toString());
        row.push(Math.max(...accounts.map(a => a.currentStreak), 0).toString());
      }
      
      if (includeLocation && user.locations) {
        const locations = user.locations as Array<{
          country: string | null;
          city: string | null;
          latitude: number;
          longitude: number;
          timezone: string | null;
        }>;
        const loc = locations[0];
        if (loc) {
          row.push(loc.country || '');
          row.push(loc.city || '');
          row.push(loc.latitude.toString());
          row.push(loc.longitude.toString());
          row.push(loc.timezone || '');
        } else {
          row.push('', '', '', '', '');
        }
      }
      
      return row;
    });

    // Generate CSV content
    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(',')),
    ].join('\n');

    // Return as downloadable CSV
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="gitgenius-users-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Failed to export users:', error);
    return NextResponse.json(
      { error: 'Failed to export users' },
      { status: 500 }
    );
  }
}
