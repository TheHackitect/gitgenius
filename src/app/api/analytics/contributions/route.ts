import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/analytics/contributions - Get contribution heatmap data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const days = parseInt(searchParams.get('days') || '365');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get account IDs to query
    let accountIds: string[];
    
    if (accountId) {
      // Verify ownership
      const account = await prisma.gitHubAccount.findFirst({
        where: {
          id: accountId,
          userId: session.user.id,
        },
      });
      
      if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
      
      accountIds = [accountId];
    } else {
      // Get all user's accounts
      const accounts = await prisma.gitHubAccount.findMany({
        where: { userId: session.user.id },
        select: { id: true },
      });
      accountIds = accounts.map(a => a.id);
    }

    // Get contribution data
    const contributions = await prisma.contributionDay.findMany({
      where: {
        githubAccountId: { in: accountIds },
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    // Aggregate by date if multiple accounts
    const aggregated = new Map<string, {
      date: string;
      count: number;
      level: number;
      commits: number;
      pullRequests: number;
      issues: number;
      reviews: number;
    }>();

    for (const c of contributions) {
      const dateStr = c.date.toISOString().split('T')[0];
      const existing = aggregated.get(dateStr);
      
      if (existing) {
        existing.count += c.contributionCount;
        existing.commits += c.commits;
        existing.pullRequests += c.pullRequests;
        existing.issues += c.issues;
        existing.reviews += c.reviews;
        // Recalculate level
        existing.level = getContributionLevel(existing.count);
      } else {
        aggregated.set(dateStr, {
          date: dateStr,
          count: c.contributionCount,
          level: c.level,
          commits: c.commits,
          pullRequests: c.pullRequests,
          issues: c.issues,
          reviews: c.reviews,
        });
      }
    }

    // Fill in missing days with zero contributions
    const result = [];
    const currentDate = new Date(startDate);
    const today = new Date();
    
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const data = aggregated.get(dateStr) || {
        date: dateStr,
        count: 0,
        level: 0,
        commits: 0,
        pullRequests: 0,
        issues: 0,
        reviews: 0,
      };
      result.push(data);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({ contributions: result });
  } catch (error) {
    console.error('Failed to fetch contributions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contributions' },
      { status: 500 }
    );
  }
}

function getContributionLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
}
