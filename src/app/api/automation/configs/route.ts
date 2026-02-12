import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addAutomationJob, cancelAutomationJob, getQueueStats } from '@/lib/queue';
import { z } from 'zod';

// GET /api/automation/configs - Get all automation configs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    const configs = await prisma.automationConfig.findMany({
      where: {
        githubAccount: {
          userId: session.user.id,
          ...(accountId && { id: accountId }),
        },
      },
      include: {
        githubAccount: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ configs });
  } catch (error) {
    console.error('Failed to fetch automation configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch automation configs' },
      { status: 500 }
    );
  }
}

// POST /api/automation/configs - Create automation config
const createConfigSchema = z.object({
  githubAccountId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isEnabled: z.boolean().default(false),
  scheduleType: z.enum(['smart', 'fixed', 'random', 'weekdays_only']).default('smart'),
  cronExpression: z.string().optional(),
  timezone: z.string().default('UTC'),
  minCommitsPerDay: z.number().min(1).max(20).default(1),
  maxCommitsPerDay: z.number().min(1).max(20).default(5),
  preferredHoursStart: z.number().min(0).max(23).default(9),
  preferredHoursEnd: z.number().min(0).max(23).default(18),
  commitTypes: z.array(z.string()).default(['readme_update']),
  commitMessageStyle: z.enum(['conventional', 'casual', 'technical']).default('conventional'),
  skipWeekends: z.boolean().default(false),
  skipHolidays: z.boolean().default(false),
  variabilityFactor: z.number().min(0).max(1).default(0.3),
  skipProbability: z.number().min(0).max(0.5).default(0.1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createConfigSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    // Verify account ownership
    const account = await prisma.gitHubAccount.findFirst({
      where: {
        id: validation.data.githubAccountId,
        userId: session.user.id,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'GitHub account not found' }, { status: 404 });
    }

    const config = await prisma.automationConfig.create({
      data: validation.data,
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'create_automation_config',
        category: 'automation',
        details: {
          configId: config.id,
          configName: config.name,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Failed to create automation config:', error);
    return NextResponse.json(
      { error: 'Failed to create automation config' },
      { status: 500 }
    );
  }
}
