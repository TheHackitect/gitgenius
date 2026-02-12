import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncGitHubAccountData } from '@/lib/github';

interface RouteParams {
  params: { id: string };
}

// GET /api/github/accounts/[id] - Get single account details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const account = await prisma.gitHubAccount.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      select: {
        id: true,
        githubId: true,
        username: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        profileUrl: true,
        isActive: true,
        isPrimary: true,
        lastSyncAt: true,
        lastCommitAt: true,
        totalRepos: true,
        totalCommits: true,
        currentStreak: true,
        longestStreak: true,
        createdAt: true,
        updatedAt: true,
        repositories: {
          select: {
            id: true,
            name: true,
            fullName: true,
            description: true,
            isPrivate: true,
            language: true,
            stars: true,
            isAutomationEnabled: true,
            lastCommitAt: true,
          },
          orderBy: { lastPushedAt: 'desc' },
          take: 10,
        },
        automationConfigs: {
          select: {
            id: true,
            name: true,
            isEnabled: true,
            scheduleType: true,
            minCommitsPerDay: true,
            maxCommitsPerDay: true,
          },
        },
        contributionDays: {
          orderBy: { date: 'desc' },
          take: 365,
        },
        _count: {
          select: {
            repositories: true,
            commitHistory: true,
            automationJobs: true,
          },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ account });
  } catch (error) {
    console.error('Failed to fetch account:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account' },
      { status: 500 }
    );
  }
}

// PATCH /api/github/accounts/[id] - Update account settings
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const account = await prisma.gitHubAccount.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const body = await request.json();
    const { isActive, isPrimary } = body;

    // If setting as primary, unset others
    if (isPrimary) {
      await prisma.gitHubAccount.updateMany({
        where: {
          userId: session.user.id,
          id: { not: params.id },
        },
        data: { isPrimary: false },
      });
    }

    const updatedAccount = await prisma.gitHubAccount.update({
      where: { id: params.id },
      data: {
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(typeof isPrimary === 'boolean' && { isPrimary }),
      },
      select: {
        id: true,
        username: true,
        isActive: true,
        isPrimary: true,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'update_github_account',
        category: 'account',
        details: {
          accountId: params.id,
          changes: body,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ account: updatedAccount });
  } catch (error) {
    console.error('Failed to update account:', error);
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}

// DELETE /api/github/accounts/[id] - Remove account
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const account = await prisma.gitHubAccount.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Delete the account (cascades to related records)
    await prisma.gitHubAccount.delete({
      where: { id: params.id },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'remove_github_account',
        category: 'account',
        details: {
          githubUsername: account.username,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
