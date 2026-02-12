import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GitHubService, encryptToken, syncGitHubAccountData } from '@/lib/github';
import { z } from 'zod';

// GET /api/github/accounts - List all GitHub accounts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await prisma.gitHubAccount.findMany({
      where: { userId: session.user.id },
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
        _count: {
          select: {
            repositories: true,
            automationConfigs: true,
          },
        },
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Failed to fetch GitHub accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

// POST /api/github/accounts - Add a new GitHub account
const addAccountSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = addAccountSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { accessToken } = validation.data;

    // Validate token and get user info
    const githubService = new GitHubService(accessToken);
    const isValid = await githubService.validateToken();

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid GitHub access token' },
        { status: 400 }
      );
    }

    const githubUser = await githubService.getAuthenticatedUser();

    // Check if account already exists
    const existingAccount = await prisma.gitHubAccount.findUnique({
      where: { githubId: githubUser.id.toString() },
    });

    if (existingAccount) {
      if (existingAccount.userId === session.user.id) {
        return NextResponse.json(
          { error: 'This GitHub account is already connected' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { error: 'This GitHub account is connected to another user' },
          { status: 400 }
        );
      }
    }

    // Check if this is the first account
    const accountCount = await prisma.gitHubAccount.count({
      where: { userId: session.user.id },
    });

    // Encrypt and store token
    const encryptedToken = encryptToken(accessToken);

    // Create the GitHub account
    const account = await prisma.gitHubAccount.create({
      data: {
        userId: session.user.id,
        githubId: githubUser.id.toString(),
        username: githubUser.login,
        displayName: githubUser.name,
        email: githubUser.email,
        avatarUrl: githubUser.avatar_url,
        profileUrl: githubUser.html_url,
        accessToken: encryptedToken,
        scopes: ['repo', 'read:user', 'user:email'],
        isPrimary: accountCount === 0,
        totalRepos: githubUser.public_repos,
      },
    });

    // Create default automation config
    await prisma.automationConfig.create({
      data: {
        githubAccountId: account.id,
        name: 'Default Automation',
        description: 'Automatically generated configuration',
        isEnabled: false,
      },
    });

    // Sync repositories in background
    syncGitHubAccountData(account.id).catch(console.error);

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'add_github_account',
        category: 'account',
        details: {
          githubUsername: githubUser.login,
          accountId: account.id,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        username: account.username,
        avatarUrl: account.avatarUrl,
      },
    });
  } catch (error) {
    console.error('Failed to add GitHub account:', error);
    return NextResponse.json(
      { error: 'Failed to add GitHub account' },
      { status: 500 }
    );
  }
}
