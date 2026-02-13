import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

// Initialize web-push with VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@gitgenius.app';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export interface PushPayload {
  title: string;
  body?: string;
  message?: string;
  icon?: string;
  url?: string;
  actionUrl?: string;
  notificationId?: string;
  tag?: string;
  requireInteraction?: boolean;
  timestamp?: number;
  actions?: Array<{ action: string; title: string }>;
}

// Send push notification to a specific user
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    if (subscriptions.length === 0) {
      return 0;
    }

    let sentCount = 0;
    const failedEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify(payload)
        );
        
        // Update last used timestamp
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastUsedAt: new Date() },
        });
        
        sentCount++;
      } catch (error: unknown) {
        console.error(`Failed to send push to ${sub.endpoint}:`, error);
        
        // Mark subscription as inactive if it's expired or invalid
        const pushError = error as { statusCode?: number };
        if (pushError.statusCode === 404 || pushError.statusCode === 410) {
          failedEndpoints.push(sub.id);
        }
      }
    }

    // Remove invalid subscriptions
    if (failedEndpoints.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: failedEndpoints } },
      });
    }

    return sentCount;
  } catch (error) {
    console.error('Failed to send push notifications:', error);
    return 0;
  }
}

// Send push notification to multiple users
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<number> {
  let totalSent = 0;
  
  for (const userId of userIds) {
    const sent = await sendPushToUser(userId, payload);
    totalSent += sent;
  }
  
  return totalSent;
}

// Send push notification to all users (for broadcasts)
export async function sendPushToAll(payload: PushPayload, targetRole?: string): Promise<number> {
  try {
    const where: Record<string, unknown> = { isActive: true };
    
    if (targetRole) {
      where.user = { role: targetRole };
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where,
      include: { user: { select: { id: true, role: true } } },
    });

    if (subscriptions.length === 0) {
      return 0;
    }

    let sentCount = 0;
    const failedIds: string[] = [];

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify(payload)
        );
        
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastUsedAt: new Date() },
        });
        
        sentCount++;
      } catch (error: unknown) {
        const pushError = error as { statusCode?: number };
        if (pushError.statusCode === 404 || pushError.statusCode === 410) {
          failedIds.push(sub.id);
        }
      }
    }

    // Cleanup invalid subscriptions
    if (failedIds.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: failedIds } },
      });
    }

    return sentCount;
  } catch (error) {
    console.error('Failed to send broadcast push:', error);
    return 0;
  }
}

// Helper to get subscription count for a user
export async function getUserSubscriptionCount(userId: string): Promise<number> {
  return prisma.pushSubscription.count({
    where: { userId, isActive: true },
  });
}

// Generate VAPID keys (run once when setting up)
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  return webpush.generateVAPIDKeys();
}

// Get public VAPID key for client
export function getVapidPublicKey(): string {
  return vapidPublicKey;
}
