import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

// Default settings
const defaultSettings = {
  maintenanceMode: false,
  allowRegistration: true,
  requireEmailVerification: false,
  maxJobsPerUser: 100,
  maxGitHubAccountsPerUser: 5,
  pushNotificationsEnabled: true,
  locationTrackingEnabled: true,
};

// GET /api/admin/settings - Get app settings
export async function GET() {
  try {
    const adminSession = await getAdminSession();
    
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get settings from database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any;
    const settingsRecord = prismaAny.appSettings ? 
      await prismaAny.appSettings.findFirst({
        where: { key: 'app_settings' },
      }).catch(() => null) : null;

    const settings = settingsRecord
      ? JSON.parse(settingsRecord.value)
      : defaultSettings;

    // Check if VAPID is configured
    const vapidConfigured = !!(
      process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
    );

    return NextResponse.json({
      ...defaultSettings,
      ...settings,
      vapidConfigured,
    });
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings - Update app settings
export async function PUT(request: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only superadmins can update settings
    if (adminSession.user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Only superadmins can update settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate and sanitize settings
    const settings = {
      maintenanceMode: !!body.maintenanceMode,
      allowRegistration: body.allowRegistration !== false,
      requireEmailVerification: !!body.requireEmailVerification,
      maxJobsPerUser: Math.min(Math.max(1, body.maxJobsPerUser || 100), 1000),
      maxGitHubAccountsPerUser: Math.min(Math.max(1, body.maxGitHubAccountsPerUser || 5), 20),
      pushNotificationsEnabled: body.pushNotificationsEnabled !== false,
      locationTrackingEnabled: body.locationTrackingEnabled !== false,
    };

    // Upsert settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any;
    if (prismaAny.appSettings) {
      await prismaAny.appSettings.upsert({
        where: { key: 'app_settings' },
        update: {
          value: JSON.stringify(settings),
          updatedAt: new Date(),
        },
        create: {
          key: 'app_settings',
          value: JSON.stringify(settings),
        },
      }).catch((error: Error) => {
        console.error('Failed to save settings to DB:', error);
      });
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
