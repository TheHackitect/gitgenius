import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getVapidPublicKey } from '@/lib/push';

// GET /api/push/vapid-public-key - Get VAPID public key
export async function GET() {
  const publicKey = getVapidPublicKey();
  
  if (!publicKey) {
    return NextResponse.json(
      { error: 'Push notifications not configured' },
      { status: 503 }
    );
  }
  
  return NextResponse.json({ publicKey });
}

// POST /api/push/subscribe - Subscribe to push notifications
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subscription, deviceName } = body;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // Check if subscription already exists
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint },
    });

    if (existing) {
      // Update existing subscription
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: {
          userId: session.user.id,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          deviceName,
          userAgent: request.headers.get('user-agent') || undefined,
          isActive: true,
          updatedAt: new Date(),
        },
      });
      
      return NextResponse.json({ success: true, updated: true });
    }

    // Create new subscription
    await prisma.pushSubscription.create({
      data: {
        userId: session.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        deviceName,
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    return NextResponse.json({ success: true, created: true });
  } catch (error) {
    console.error('Failed to save push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}

// DELETE /api/push/subscribe - Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint required' },
        { status: 400 }
      );
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        userId: session.user.id,
        endpoint,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    );
  }
}
