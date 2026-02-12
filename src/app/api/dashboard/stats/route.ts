import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { subDays, startOfDay, startOfWeek, startOfMonth } from 'date-fns';

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const today = startOfDay(new Date());
    const weekStart = startOfWeek(new Date());
    const monthStart = startOfMonth(new Date());

    // Get all user's GitHub account IDs
    const accounts = await prisma.gitHubAccount.findMany({
      where: { userId },
      select: { id: true },
    });
    const accountIds = accounts.map(a => a.id);

    // Parallel queries for stats
    const [
      totalAccounts,
      totalRepositories,
      totalCommits,
      automatedCommits,
      contributionsToday,
      contributionsThisWeek,
      contributionsThisMonth,
      activeAutomations,
      accountsWithStreaks,
    ] = await Promise.all([
      // Total accounts
      prisma.gitHubAccount.count({
        where: { userId },
      }),
      
      // Total repositories
      prisma.repository.count({
        where: { githubAccountId: { in: accountIds } },
      }),
      
      // Total commits
      prisma.commitRecord.count({
        where: { githubAccountId: { in: accountIds } },
      }),
      
      // Automated commits
      prisma.commitRecord.count({
        where: {
          githubAccountId: { in: accountIds },
          isAutomated: true,
        },
      }),
      
      // Contributions today
      prisma.contributionDay.aggregate({
        where: {
          githubAccountId: { in: accountIds },
          date: today,
        },
        _sum: { contributionCount: true },
      }),
      
      // Contributions this week
      prisma.contributionDay.aggregate({
        where: {
          githubAccountId: { in: accountIds },
          date: { gte: weekStart },
        },
        _sum: { contributionCount: true },
      }),
      
      // Contributions this month
      prisma.contributionDay.aggregate({
        where: {
          githubAccountId: { in: accountIds },
          date: { gte: monthStart },
        },
        _sum: { contributionCount: true },
      }),
      
      // Active automation configs
      prisma.automationConfig.count({
        where: {
          githubAccountId: { in: accountIds },
          isEnabled: true,
        },
      }),
      
      // Get streaks from accounts
      prisma.gitHubAccount.findMany({
        where: { userId },
        select: {
          currentStreak: true,
          longestStreak: true,
        },
      }),
    ]);

    // Calculate best streaks across all accounts
    const currentStreak = Math.max(...accountsWithStreaks.map(a => a.currentStreak), 0);
    const longestStreak = Math.max(...accountsWithStreaks.map(a => a.longestStreak), 0);

    return NextResponse.json({
      stats: {
        totalAccounts,
        totalRepositories,
        totalCommits,
        automatedCommits,
        currentStreak,
        longestStreak,
        contributionsToday: contributionsToday._sum.contributionCount || 0,
        contributionsThisWeek: contributionsThisWeek._sum.contributionCount || 0,
        contributionsThisMonth: contributionsThisMonth._sum.contributionCount || 0,
        activeAutomations,
      },
    });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
