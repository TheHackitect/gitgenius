import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

interface RouteParams {
  params: { id: string };
}

// GET /api/automation/configs/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await prisma.automationConfig.findFirst({
      where: {
        id: params.id,
        githubAccount: {
          userId: session.user.id,
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
    });

    if (!config) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Failed to fetch config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch config' },
      { status: 500 }
    );
  }
}

// PATCH /api/automation/configs/[id]
const updateConfigSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  isEnabled: z.boolean().optional(),
  scheduleType: z.enum(['smart', 'fixed', 'random', 'weekdays_only']).optional(),
  cronExpression: z.string().optional(),
  timezone: z.string().optional(),
  minCommitsPerDay: z.number().min(1).max(20).optional(),
  maxCommitsPerDay: z.number().min(1).max(20).optional(),
  preferredHoursStart: z.number().min(0).max(23).optional(),
  preferredHoursEnd: z.number().min(0).max(23).optional(),
  commitTypes: z.array(z.string()).optional(),
  commitMessageStyle: z.enum(['conventional', 'casual', 'technical']).optional(),
  skipWeekends: z.boolean().optional(),
  skipHolidays: z.boolean().optional(),
  variabilityFactor: z.number().min(0).max(1).optional(),
  skipProbability: z.number().min(0).max(0.5).optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await prisma.automationConfig.findFirst({
      where: {
        id: params.id,
        githubAccount: {
          userId: session.user.id,
        },
      },
    });

    if (!config) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateConfigSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const updated = await prisma.automationConfig.update({
      where: { id: params.id },
      data: validation.data,
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: validation.data.isEnabled !== undefined
          ? (validation.data.isEnabled ? 'enable_automation' : 'disable_automation')
          : 'update_automation_config',
        category: 'automation',
        details: {
          configId: params.id,
          changes: validation.data,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ config: updated });
  } catch (error) {
    console.error('Failed to update config:', error);
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    );
  }
}

// DELETE /api/automation/configs/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await prisma.automationConfig.findFirst({
      where: {
        id: params.id,
        githubAccount: {
          userId: session.user.id,
        },
      },
    });

    if (!config) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }

    await prisma.automationConfig.delete({
      where: { id: params.id },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'delete_automation_config',
        category: 'automation',
        details: {
          configId: params.id,
          configName: config.name,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete config:', error);
    return NextResponse.json(
      { error: 'Failed to delete config' },
      { status: 500 }
    );
  }
}
