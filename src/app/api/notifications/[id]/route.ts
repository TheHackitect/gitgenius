import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/notifications/[id] - Update notification (mark as read/archive)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const body = await request.json();
    const { isRead, isArchived } = body;

    // Verify ownership
    const notification = await prisma.notification.findFirst({
      where: {
        id: resolvedParams.id,
        userId: session.user.id,
      },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const updated = await prisma.notification.update({
      where: { id: resolvedParams.id },
      data: {
        ...(typeof isRead === 'boolean' ? { isRead } : {}),
        ...(typeof isArchived === 'boolean' ? { isArchived } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id] - Archive notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;

    // Verify ownership
    const notification = await prisma.notification.findFirst({
      where: {
        id: resolvedParams.id,
        userId: session.user.id,
      },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    await prisma.notification.update({
      where: { id: resolvedParams.id },
      data: { isArchived: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to archive notification:', error);
    return NextResponse.json(
      { error: 'Failed to archive notification' },
      { status: 500 }
    );
  }
}
