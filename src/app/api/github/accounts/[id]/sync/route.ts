import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncGitHubAccountData } from '@/lib/github';

interface RouteParams {
  params: { id: string };
}

// POST /api/github/accounts/[id]/sync - Sync account data
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Sync data
    await syncGitHubAccountData(params.id);

    // Get updated account
    const updatedAccount = await prisma.gitHubAccount.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        username: true,
        totalRepos: true,
        lastSyncAt: true,
        _count: {
          select: { repositories: true },
        },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'sync_github_account',
        category: 'account',
        details: {
          accountId: params.id,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      account: updatedAccount,
    });
  } catch (error) {
    console.error('Failed to sync account:', error);
    return NextResponse.json(
      { error: 'Failed to sync account' },
      { status: 500 }
    );
  }
}
