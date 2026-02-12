import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GitHubService } from '@/lib/github';
import { z } from 'zod';

// GET /api/repositories - Get all repositories across accounts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';
    const automationEnabled = searchParams.get('automationEnabled');

    const where = {
      githubAccount: {
        userId: session.user.id,
        ...(accountId && { id: accountId }),
      },
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(automationEnabled !== null && {
        isAutomationEnabled: automationEnabled === 'true',
      }),
    };

    const [repositories, total] = await Promise.all([
      prisma.repository.findMany({
        where,
        include: {
          githubAccount: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: { commits: true },
          },
        },
        orderBy: { lastPushedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.repository.count({ where }),
    ]);

    return NextResponse.json({
      repositories,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Failed to fetch repositories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repositories' },
      { status: 500 }
    );
  }
}

// POST /api/repositories - Create a new repository
const createRepoSchema = z.object({
  githubAccountId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isPrivate: z.boolean().default(true),
  autoInit: z.boolean().default(true),
  enableAutomation: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createRepoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { githubAccountId, name, description, isPrivate, autoInit, enableAutomation } = validation.data;

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

    // Create repository on GitHub
    const githubService = await GitHubService.fromGitHubAccountId(githubAccountId);
    const githubRepo = await githubService.createRepository({
      name,
      description,
      private: isPrivate,
      auto_init: autoInit,
    });

    // Store in database
    const repository = await prisma.repository.create({
      data: {
        githubAccountId,
        githubRepoId: githubRepo.id.toString(),
        name: githubRepo.name,
        fullName: githubRepo.full_name,
        description: githubRepo.description,
        htmlUrl: githubRepo.html_url,
        cloneUrl: githubRepo.clone_url,
        sshUrl: githubRepo.ssh_url,
        isPrivate: githubRepo.private,
        defaultBranch: githubRepo.default_branch,
        isAutomationEnabled: enableAutomation,
        repoCreatedAt: new Date(githubRepo.created_at),
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'create_repository',
        category: 'repository',
        details: {
          repositoryName: name,
          repositoryId: repository.id,
          githubAccountId,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      repository: {
        id: repository.id,
        name: repository.name,
        fullName: repository.fullName,
        htmlUrl: repository.htmlUrl,
      },
    });
  } catch (error) {
    console.error('Failed to create repository:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create repository' },
      { status: 500 }
    );
  }
}
