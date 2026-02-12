import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addAutomationJob, cancelAutomationJob, runJobNow, retryJob } from '@/lib/queue';

// GET /api/automation/jobs - Get automation jobs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where = {
      githubAccount: {
        userId: session.user.id,
        ...(accountId && { id: accountId }),
      },
      ...(status && { status }),
    };

    const [jobs, total] = await Promise.all([
      prisma.automationJob.findMany({
        where,
        include: {
          githubAccount: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { scheduledFor: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.automationJob.count({ where }),
    ]);

    return NextResponse.json({
      jobs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Failed to fetch jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

// POST /api/automation/jobs - Trigger a manual automation job
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { githubAccountId, scheduledFor } = body;

    // Verify account ownership
    const account = await prisma.gitHubAccount.findFirst({
      where: {
        id: githubAccountId,
        userId: session.user.id,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'GitHub account not found' }, { status: 404 });
    }

    // Check if there are enabled repositories
    const enabledRepos = await prisma.repository.count({
      where: {
        githubAccountId,
        isAutomationEnabled: true,
      },
    });

    if (enabledRepos === 0) {
      return NextResponse.json(
        { error: 'No repositories enabled for automation' },
        { status: 400 }
      );
    }

    // Add job
    const jobId = await addAutomationJob(
      githubAccountId,
      scheduledFor ? new Date(scheduledFor) : undefined
    );

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'trigger_manual_job',
        category: 'automation',
        details: {
          jobId,
          githubAccountId,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      jobId,
    });
  } catch (error) {
    console.error('Failed to trigger job:', error);
    return NextResponse.json(
      { error: 'Failed to trigger job' },
      { status: 500 }
    );
  }
}

// DELETE /api/automation/jobs - Cancel a job
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // Verify job ownership
    const job = await prisma.automationJob.findFirst({
      where: {
        id: jobId,
        githubAccount: {
          userId: session.user.id,
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only cancel pending jobs' },
        { status: 400 }
      );
    }

    await cancelAutomationJob(jobId);

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'cancel_job',
        category: 'automation',
        details: {
          jobId,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to cancel job:', error);
    return NextResponse.json(
      { error: 'Failed to cancel job' },
      { status: 500 }
    );
  }
}

// PATCH /api/automation/jobs - Run a job now or retry a failed job
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, action } = body;

    if (!jobId || !action) {
      return NextResponse.json({ error: 'Job ID and action required' }, { status: 400 });
    }

    if (!['run_now', 'retry'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Verify job ownership
    const job = await prisma.automationJob.findFirst({
      where: {
        id: jobId,
        githubAccount: {
          userId: session.user.id,
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (action === 'run_now') {
      if (job.status !== 'pending') {
        return NextResponse.json(
          { error: 'Can only run pending jobs immediately' },
          { status: 400 }
        );
      }

      await runJobNow(jobId);

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'run_job_now',
          category: 'automation',
          details: {
            jobId,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } else if (action === 'retry') {
      if (job.status !== 'failed') {
        return NextResponse.json(
          { error: 'Can only retry failed jobs' },
          { status: 400 }
        );
      }

      await retryJob(jobId);

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'retry_job',
          category: 'automation',
          details: {
            jobId,
            timestamp: new Date().toISOString(),
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update job:', error);
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    );
  }
}
