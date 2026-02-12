import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

interface RouteParams {
  params: { id: string };
}

// GET /api/repositories/[id] - Get repository details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const repository = await prisma.repository.findFirst({
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
        commits: {
          orderBy: { committedAt: 'desc' },
          take: 20,
        },
        _count: {
          select: { commits: true },
        },
      },
    });

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    return NextResponse.json({ repository });
  } catch (error) {
    console.error('Failed to fetch repository:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repository' },
      { status: 500 }
    );
  }
}

// PATCH /api/repositories/[id] - Update repository settings
const updateRepoSchema = z.object({
  isAutomationEnabled: z.boolean().optional(),
  automationPriority: z.number().min(1).max(10).optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const repository = await prisma.repository.findFirst({
      where: {
        id: params.id,
        githubAccount: {
          userId: session.user.id,
        },
      },
    });

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateRepoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const updated = await prisma.repository.update({
      where: { id: params.id },
      data: validation.data,
      select: {
        id: true,
        name: true,
        isAutomationEnabled: true,
        automationPriority: true,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'update_repository',
        category: 'repository',
        details: {
          repositoryId: params.id,
          changes: validation.data,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ repository: updated });
  } catch (error) {
    console.error('Failed to update repository:', error);
    return NextResponse.json(
      { error: 'Failed to update repository' },
      { status: 500 }
    );
  }
}
