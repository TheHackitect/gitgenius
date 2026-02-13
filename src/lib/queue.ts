import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { prisma } from './prisma';
import { executeAutomationJob } from './automation';
import { notifyJobCancelled } from './notifications';

// Build Redis connection options from env vars
const getRedisConnection = () => {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  return {
    host,
    port,
    maxRetriesPerRequest: null,
  };
};

const redisConnection = getRedisConnection();

// Queue names
export const QUEUE_NAMES = {
  AUTOMATION: 'automation',
  SYNC: 'sync',
  ANALYTICS: 'analytics',
} as const;

// Create queues
export const automationQueue = new Queue(QUEUE_NAMES.AUTOMATION, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
    },
  },
});

export const syncQueue = new Queue(QUEUE_NAMES.SYNC, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  },
});

export const analyticsQueue = new Queue(QUEUE_NAMES.ANALYTICS, {
  connection: redisConnection,
});

// Job types
export interface AutomationJobData {
  jobId: string;
  githubAccountId: string;
  type: 'commit' | 'repo_update';
}

export interface SyncJobData {
  githubAccountId: string;
  syncType: 'full' | 'repos' | 'contributions';
}

export interface AnalyticsJobData {
  userId: string;
  type: 'daily_report' | 'weekly_report' | 'calculate_streaks';
}

// Schedule automation jobs
export async function scheduleAutomationJobs(): Promise<void> {
  const enabledConfigs = await prisma.automationConfig.findMany({
    where: {
      isEnabled: true,
      githubAccount: {
        isActive: true,
      },
    },
    include: {
      githubAccount: true,
    },
  });

  for (const config of enabledConfigs) {
    await scheduleJobsForConfig(config);
  }
}

async function scheduleJobsForConfig(config: {
  id: string;
  githubAccountId: string;
  minCommitsPerDay: number;
  maxCommitsPerDay: number;
  preferredHoursStart: number;
  preferredHoursEnd: number;
  variabilityFactor: number;
  skipProbability: number;
  skipWeekends: boolean;
  timezone: string;
}): Promise<void> {
  const today = new Date();
  
  // Check if we should skip today
  if (config.skipWeekends) {
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return; // Skip weekends
    }
  }

  // Random skip based on probability
  if (Math.random() < config.skipProbability) {
    return;
  }

  // Calculate number of commits for today
  const commitsToday = Math.floor(
    config.minCommitsPerDay +
    Math.random() * (config.maxCommitsPerDay - config.minCommitsPerDay + 1)
  );

  // Check existing jobs for today
  const existingJobs = await prisma.automationJob.count({
    where: {
      githubAccountId: config.githubAccountId,
      scheduledFor: {
        gte: new Date(today.setHours(0, 0, 0, 0)),
        lt: new Date(today.setHours(23, 59, 59, 999)),
      },
      status: { in: ['pending', 'running', 'completed'] },
    },
  });

  const jobsToCreate = Math.max(0, commitsToday - existingJobs);

  for (let i = 0; i < jobsToCreate; i++) {
    // Calculate random time within preferred hours
    const hour = config.preferredHoursStart + 
      Math.random() * (config.preferredHoursEnd - config.preferredHoursStart);
    const minute = Math.floor(Math.random() * 60);
    
    // Add variability
    const variabilityMinutes = Math.floor(
      (Math.random() - 0.5) * 2 * 60 * config.variabilityFactor
    );

    const scheduledTime = new Date();
    scheduledTime.setHours(Math.floor(hour), minute + variabilityMinutes, 0, 0);

    // Don't schedule in the past
    if (scheduledTime < new Date()) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    // Create job in database
    const job = await prisma.automationJob.create({
      data: {
        githubAccountId: config.githubAccountId,
        jobType: 'commit',
        status: 'pending',
        scheduledFor: scheduledTime,
        priority: 5,
      },
    });

    // Add to queue with delay
    const delay = scheduledTime.getTime() - Date.now();
    
    await automationQueue.add(
      'execute-automation',
      {
        jobId: job.id,
        githubAccountId: config.githubAccountId,
        type: 'commit',
      } satisfies AutomationJobData,
      {
        delay: Math.max(0, delay),
        jobId: job.id,
      }
    );
  }
}

// Add a single job to the queue
export async function addAutomationJob(
  githubAccountId: string,
  scheduledFor?: Date
): Promise<string> {
  const scheduledTime = scheduledFor || new Date();

  const job = await prisma.automationJob.create({
    data: {
      githubAccountId,
      jobType: 'commit',
      status: 'pending',
      scheduledFor: scheduledTime,
      priority: 5,
    },
  });

  const delay = scheduledTime.getTime() - Date.now();

  await automationQueue.add(
    'execute-automation',
    {
      jobId: job.id,
      githubAccountId,
      type: 'commit',
    } satisfies AutomationJobData,
    {
      delay: Math.max(0, delay),
      jobId: job.id,
    }
  );

  return job.id;
}

// Cancel a scheduled job
export async function cancelAutomationJob(jobId: string): Promise<void> {
  const bullJob = await automationQueue.getJob(jobId);
  if (bullJob) {
    await bullJob.remove();
  }

  const job = await prisma.automationJob.update({
    where: { id: jobId },
    data: { status: 'cancelled' },
    include: {
      githubAccount: {
        select: { userId: true, username: true },
      },
    },
  });

  // Send cancellation notification
  await notifyJobCancelled(
    job.githubAccount.userId,
    jobId,
    job.githubAccount.username
  );
}

// Run a pending job immediately
export async function runJobNow(jobId: string): Promise<void> {
  // Remove existing job from queue
  const bullJob = await automationQueue.getJob(jobId);
  if (bullJob) {
    await bullJob.remove();
  }

  // Get the job data from database
  const job = await prisma.automationJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new Error('Job not found');
  }

  // Update scheduled time to now
  await prisma.automationJob.update({
    where: { id: jobId },
    data: { scheduledFor: new Date() },
  });

  // Re-add to queue with no delay (immediate execution)
  await automationQueue.add(
    'execute-automation',
    {
      jobId: job.id,
      githubAccountId: job.githubAccountId,
      type: 'commit',
    } satisfies AutomationJobData,
    {
      delay: 0,
      jobId: job.id,
    }
  );
}

// Retry a failed job
export async function retryJob(jobId: string): Promise<void> {
  const job = await prisma.automationJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new Error('Job not found');
  }

  // Reset job status
  await prisma.automationJob.update({
    where: { id: jobId },
    data: { 
      status: 'pending',
      scheduledFor: new Date(),
      lastError: null,
      attempts: 0,
    },
  });

  // Add to queue for immediate execution
  await automationQueue.add(
    'execute-automation',
    {
      jobId: job.id,
      githubAccountId: job.githubAccountId,
      type: 'commit',
    } satisfies AutomationJobData,
    {
      delay: 0,
      jobId: job.id,
    }
  );
}

// Get queue statistics
export async function getQueueStats(): Promise<{
  automation: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
}> {
  const automation = await automationQueue.getJobCounts();

  return {
    automation: {
      waiting: automation.waiting || 0,
      active: automation.active || 0,
      completed: automation.completed || 0,
      failed: automation.failed || 0,
      delayed: automation.delayed || 0,
    },
  };
}

// Worker implementation (run separately)
export function createAutomationWorker(): Worker {
  return new Worker<AutomationJobData>(
    QUEUE_NAMES.AUTOMATION,
    async (job: Job<AutomationJobData>) => {
      console.log(`Processing automation job: ${job.id}`);
      
      try {
        await executeAutomationJob(job.data.jobId);
        console.log(`Completed automation job: ${job.id}`);
      } catch (error) {
        console.error(`Failed automation job: ${job.id}`, error);
        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 60000, // Max 10 jobs per minute
      },
    }
  );
}
