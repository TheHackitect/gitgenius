import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

// GET /api/admin/analytics - Get platform analytics
export async function GET(request: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (range) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default: // 7d
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get daily activity
    const jobs = await prisma.automationJob.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        status: true,
        githubAccountId: true,
      },
    });

    const commits = await prisma.commitRecord.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        githubAccountId: true,
      },
    });

    const activityLogs = await prisma.activityLog.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        userId: true,
        createdAt: true,
      },
    });

    // Group by day
    const dailyMap = new Map<string, { jobs: number; commits: number; users: Set<string> }>();
    
    jobs.forEach((job) => {
      const date = job.createdAt.toISOString().split('T')[0];
      const day = dailyMap.get(date) || { jobs: 0, commits: 0, users: new Set() };
      day.jobs++;
      dailyMap.set(date, day);
    });

    commits.forEach((commit) => {
      const date = commit.createdAt.toISOString().split('T')[0];
      const day = dailyMap.get(date) || { jobs: 0, commits: 0, users: new Set() };
      day.commits++;
      dailyMap.set(date, day);
    });

    activityLogs.forEach((log) => {
      const date = log.createdAt.toISOString().split('T')[0];
      const day = dailyMap.get(date) || { jobs: 0, commits: 0, users: new Set() };
      day.users.add(log.userId);
      dailyMap.set(date, day);
    });

    const dailyActivity = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        jobs: data.jobs,
        commits: data.commits,
        users: data.users.size,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // Get top users by activity
    const userStats = await prisma.activityLog.groupBy({
      by: ['userId'],
      _count: { id: true },
      where: {
        createdAt: { gte: startDate },
      },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const topUserIds = userStats.map((s) => s.userId);
    const topUsersData = await prisma.user.findMany({
      where: { id: { in: topUserIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = new Map(topUsersData.map((u) => [u.id, u]));

    // Get job counts using simple queries (more compatible)
    const jobCountMap = new Map<string, number>();
    const commitCountMap = new Map<string, number>();

    for (const userId of topUserIds) {
      // Get GitHub account IDs for this user
      const accounts = await prisma.gitHubAccount.findMany({
        where: { userId },
        select: { id: true },
      });
      const accountIds = accounts.map(a => a.id);

      if (accountIds.length > 0) {
        const jobCount = await prisma.automationJob.count({
          where: { githubAccountId: { in: accountIds } },
        });
        const commitCount = await prisma.commitRecord.count({
          where: { githubAccountId: { in: accountIds } },
        });
        jobCountMap.set(userId, jobCount);
        commitCountMap.set(userId, commitCount);
      }
    }

    const topUsers = userStats.map((stat) => {
      const user = userMap.get(stat.userId);
      return {
        id: stat.userId,
        name: user?.name || null,
        email: user?.email || '',
        jobCount: jobCountMap.get(stat.userId) || 0,
        commitCount: commitCountMap.get(stat.userId) || 0,
      };
    });

    // Jobs by status
    const jobsByStatus = await prisma.automationJob.groupBy({
      by: ['status'],
      _count: { id: true },
      where: {
        createdAt: { gte: startDate },
      },
    });

    // Hourly distribution
    const hourlyDistribution = [];
    for (let hour = 0; hour < 24; hour++) {
      const count = jobs.filter((j) => j.createdAt.getHours() === hour).length;
      hourlyDistribution.push({ hour, count });
    }

    return NextResponse.json({
      dailyActivity,
      topUsers,
      jobsByStatus: jobsByStatus.map((j) => ({
        status: j.status,
        count: j._count.id,
      })),
      hourlyDistribution,
    });
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
