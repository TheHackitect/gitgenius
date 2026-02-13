import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { sendPushToAll, sendPushToUsers } from '@/lib/push';
import { createNotification } from '@/lib/notifications';

// GET /api/admin/broadcasts - Get all broadcast notifications
export async function GET(request: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 50);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const [broadcasts, total] = await Promise.all([
      prisma.broadcastNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.broadcastNotification.count({ where }),
    ]);

    return NextResponse.json({
      broadcasts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Failed to fetch broadcasts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch broadcasts' },
      { status: 500 }
    );
  }
}

// POST /api/admin/broadcasts - Create and optionally send a broadcast
export async function POST(request: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      title, 
      message, 
      icon, 
      actionUrl, 
      targetRole, 
      targetUserIds, 
      scheduledFor,
      sendNow,
    } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    const broadcast = await prisma.broadcastNotification.create({
      data: {
        title,
        message,
        icon,
        actionUrl,
        targetRole,
        targetUserIds: targetUserIds || [],
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        status: sendNow ? 'sent' : (scheduledFor ? 'scheduled' : 'draft'),
        sentAt: sendNow ? new Date() : null,
        createdBy: adminSession.user.id,
      },
    });

    // Send immediately if requested
    if (sendNow) {
      const sentCount = await sendBroadcastNotifications(
        broadcast.id,
        title,
        message,
        icon,
        actionUrl,
        targetRole,
        targetUserIds
      );

      await prisma.broadcastNotification.update({
        where: { id: broadcast.id },
        data: { totalSent: sentCount },
      });
    }

    return NextResponse.json({ broadcast });
  } catch (error) {
    console.error('Failed to create broadcast:', error);
    return NextResponse.json(
      { error: 'Failed to create broadcast' },
      { status: 500 }
    );
  }
}

// Helper function to send broadcast notifications
async function sendBroadcastNotifications(
  broadcastId: string,
  title: string,
  message: string,
  icon?: string,
  actionUrl?: string,
  targetRole?: string,
  targetUserIds?: string[]
): Promise<number> {
  try {
    // Get target users
    let userIds: string[];
    
    if (targetUserIds && targetUserIds.length > 0) {
      userIds = targetUserIds;
    } else {
      const where: Record<string, unknown> = { isActive: true, isBanned: false };
      if (targetRole) {
        where.role = targetRole;
      }
      
      const users = await prisma.user.findMany({
        where,
        select: { id: true },
      });
      userIds = users.map(u => u.id);
    }

    // Create in-app notifications
    let createdCount = 0;
    for (const userId of userIds) {
      const notification = await createNotification({
        userId,
        type: 'broadcast',
        title,
        message,
        icon,
        actionUrl,
        sendPush: false, // We'll send push separately
      });
      
      if (notification) {
        // Link to broadcast
        await prisma.notification.update({
          where: { id: notification.id },
          data: { broadcastId },
        });
        createdCount++;
      }
    }

    // Send push notifications
    const pushPayload = {
      title,
      body: message,
      icon: icon || '📢',
      actionUrl: actionUrl || '/dashboard',
      tag: `broadcast-${broadcastId}`,
    };

    if (targetUserIds && targetUserIds.length > 0) {
      await sendPushToUsers(targetUserIds, pushPayload);
    } else {
      await sendPushToAll(pushPayload, targetRole);
    }

    return createdCount;
  } catch (error) {
    console.error('Failed to send broadcast notifications:', error);
    return 0;
  }
}
