import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const cursor = searchParams.get('cursor');

    const whereClause = {
      userId: session.user.id,
      isArchived: false,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    // Get count of unread notifications
    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
        isArchived: false,
      },
    });

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, -1) : notifications;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({
      notifications: items,
      unreadCount,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications - Mark all as read
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to mark notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications - Archive all notifications
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
      },
      data: {
        isArchived: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to archive notifications:', error);
    return NextResponse.json(
      { error: 'Failed to archive notifications' },
      { status: 500 }
    );
  }
}
