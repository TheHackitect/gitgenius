import { prisma } from '@/lib/prisma';

export type NotificationType = 
  | 'job_completed' 
  | 'job_failed' 
  | 'streak_milestone' 
  | 'account_warning' 
  | 'system'
  | 'job_cancelled'
  | 'welcome';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  resourceType?: 'job' | 'account' | 'repository';
  resourceId?: string;
  actionUrl?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        icon: params.icon || getIconForType(params.type),
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        actionUrl: params.actionUrl,
      },
    });
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

function getIconForType(type: NotificationType): string {
  switch (type) {
    case 'job_completed':
      return '✅';
    case 'job_failed':
      return '❌';
    case 'job_cancelled':
      return '🚫';
    case 'streak_milestone':
      return '🔥';
    case 'account_warning':
      return '⚠️';
    case 'welcome':
      return '👋';
    case 'system':
    default:
      return '🔔';
  }
}

// Helper functions for common notification types
export async function notifyJobCompleted(
  userId: string,
  jobId: string,
  repoName: string,
  commitCount: number
) {
  return createNotification({
    userId,
    type: 'job_completed',
    title: 'Automation Complete',
    message: `Successfully created ${commitCount} commit${commitCount > 1 ? 's' : ''} in ${repoName}`,
    resourceType: 'job',
    resourceId: jobId,
    actionUrl: '/dashboard/jobs',
  });
}

export async function notifyJobFailed(
  userId: string,
  jobId: string,
  repoName: string,
  error: string
) {
  return createNotification({
    userId,
    type: 'job_failed',
    title: 'Automation Failed',
    message: `Job for ${repoName} failed: ${error.substring(0, 100)}`,
    resourceType: 'job',
    resourceId: jobId,
    actionUrl: '/dashboard/jobs',
  });
}

export async function notifyJobCancelled(
  userId: string,
  jobId: string,
  repoName: string
) {
  return createNotification({
    userId,
    type: 'job_cancelled',
    title: 'Job Cancelled',
    message: `Automation job for ${repoName} was cancelled`,
    resourceType: 'job',
    resourceId: jobId,
    actionUrl: '/dashboard/jobs',
  });
}

export async function notifyStreakMilestone(
  userId: string,
  streakDays: number
) {
  let title: string;
  let message: string;

  if (streakDays === 7) {
    title = '1 Week Streak! 🎉';
    message = "You've maintained a 7-day contribution streak. Keep it up!";
  } else if (streakDays === 30) {
    title = '30 Day Streak! 🚀';
    message = "Incredible! You've contributed for 30 consecutive days!";
  } else if (streakDays === 100) {
    title = '100 Day Streak! 💯';
    message = "Legendary! You've reached a 100-day contribution streak!";
  } else if (streakDays === 365) {
    title = '365 Day Streak! 🏆';
    message = "Unstoppable! A full year of daily contributions!";
  } else {
    title = `${streakDays} Day Streak!`;
    message = `You've maintained a ${streakDays}-day contribution streak.`;
  }

  return createNotification({
    userId,
    type: 'streak_milestone',
    title,
    message,
    actionUrl: '/dashboard/analytics',
  });
}

export async function notifyAccountWarning(
  userId: string,
  accountUsername: string,
  warning: string
) {
  return createNotification({
    userId,
    type: 'account_warning',
    title: 'Account Warning',
    message: `${accountUsername}: ${warning}`,
    actionUrl: '/dashboard/accounts',
  });
}

export async function notifyWelcome(userId: string, userName?: string) {
  return createNotification({
    userId,
    type: 'welcome',
    title: 'Welcome to GitGenius!',
    message: `Hi${userName ? ` ${userName}` : ''}! Connect your GitHub account to get started with automated contributions.`,
    actionUrl: '/dashboard/accounts',
  });
}

// Get unread notification count
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
      isArchived: false,
    },
  });
}
