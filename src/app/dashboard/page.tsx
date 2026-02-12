'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  GitBranch,
  GitCommit,
  Activity,
  Flame,
  TrendingUp,
  Calendar,
  ArrowRight,
  Plus,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface DashboardStats {
  totalAccounts: number;
  activeAccounts: number;
  totalRepositories: number;
  activeRepositories: number;
  totalCommits: number;
  commitsThisWeek: number;
  commitsToday: number;
  currentStreak: number;
  longestStreak: number;
  successRate: number;
  pendingJobs: number;
  failedJobs: number;
}

interface RecentActivity {
  id: string;
  type: string;
  message: string;
  repositoryName: string;
  status: string;
  createdAt: string;
}

interface ContributionDay {
  date: string;
  count: number;
  level: number;
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch('/api/dashboard/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

async function fetchRecentActivity(): Promise<RecentActivity[]> {
  const res = await fetch('/api/analytics/activity?limit=10');
  if (!res.ok) throw new Error('Failed to fetch activity');
  return res.json();
}

async function fetchContributions(): Promise<ContributionDay[]> {
  const res = await fetch('/api/analytics/contributions');
  if (!res.ok) throw new Error('Failed to fetch contributions');
  return res.json();
}

function ContributionGrid({ contributions }: { contributions: ContributionDay[] }) {
  const weeks: ContributionDay[][] = [];
  let currentWeek: ContributionDay[] = [];

  contributions.forEach((day, index) => {
    currentWeek.push(day);
    if ((index + 1) % 7 === 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  const getContributionColor = (level: number) => {
    switch (level) {
      case 0:
        return 'bg-muted';
      case 1:
        return 'bg-green-200 dark:bg-green-900';
      case 2:
        return 'bg-green-400 dark:bg-green-700';
      case 3:
        return 'bg-green-500 dark:bg-green-500';
      case 4:
        return 'bg-green-600 dark:bg-green-400';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="flex gap-1 overflow-x-auto pb-2">
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="flex flex-col gap-1">
          {week.map((day, dayIndex) => (
            <div
              key={`${weekIndex}-${dayIndex}`}
              className={cn(
                'w-3 h-3 rounded-sm transition-colors',
                getContributionColor(day.level)
              )}
              title={`${day.date}: ${day.count} contributions`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {trend && (
            <span className={cn('font-medium', trend.positive ? 'text-green-500' : 'text-red-500')}>
              {trend.positive ? '+' : ''}{trend.value}%
            </span>
          )}
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

function ActivityItem({ activity }: { activity: RecentActivity }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="flex items-start gap-4 p-4 border-b last:border-b-0">
      <div className={cn('w-2 h-2 mt-2 rounded-full', getStatusColor(activity.status))} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{activity.message}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {activity.repositoryName}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: fetchRecentActivity,
  });

  const { data: contributions, isLoading: contributionsLoading } = useQuery({
    queryKey: ['contributions'],
    queryFn: fetchContributions,
  });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your GitHub automation activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/accounts">
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Commits"
          value={stats?.totalCommits || 0}
          description="all time"
          icon={GitCommit}
          trend={{ value: stats?.commitsThisWeek || 0, positive: true }}
        />
        <StatCard
          title="Current Streak"
          value={`${stats?.currentStreak || 0} days`}
          description={`Longest: ${stats?.longestStreak || 0} days`}
          icon={Flame}
        />
        <StatCard
          title="Active Repos"
          value={`${stats?.activeRepositories || 0}/${stats?.totalRepositories || 0}`}
          description="with automation enabled"
          icon={GitBranch}
        />
        <StatCard
          title="Success Rate"
          value={`${stats?.successRate || 0}%`}
          description="automation success"
          icon={TrendingUp}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contribution Graph */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Contribution Activity</CardTitle>
              <CardDescription>Your contribution graph from automated commits</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/analytics">
                View Details
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {contributionsLoading ? (
              <div className="h-24 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : contributions && contributions.length > 0 ? (
              <ContributionGrid contributions={contributions} />
            ) : (
              <div className="h-24 flex items-center justify-center text-muted-foreground">
                No contribution data yet
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center justify-end gap-2 mt-4">
              <span className="text-xs text-muted-foreground">Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-muted" />
                <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" />
                <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700" />
                <div className="w-3 h-3 rounded-sm bg-green-500" />
                <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-400" />
              </div>
              <span className="text-xs text-muted-foreground">More</span>
            </div>
          </CardContent>
        </Card>

        {/* Automation Status */}
        <Card>
          <CardHeader>
            <CardTitle>Automation Status</CardTitle>
            <CardDescription>Current automation health</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Today's Commits</span>
                <span className="font-medium">{stats?.commitsToday || 0}</span>
              </div>
              <Progress value={(stats?.commitsToday || 0) * 20} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Success Rate</span>
                <span className="font-medium">{stats?.successRate || 0}%</span>
              </div>
              <Progress value={stats?.successRate || 0} className="h-2" />
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pending Jobs</span>
                <Badge variant="secondary">{stats?.pendingJobs || 0}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Failed Jobs</span>
                <Badge variant={stats?.failedJobs ? 'destructive' : 'secondary'}>
                  {stats?.failedJobs || 0}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Active Accounts</span>
                <Badge variant="outline">{stats?.activeAccounts || 0}</Badge>
              </div>
            </div>

            <Button className="w-full" variant="outline" asChild>
              <Link href="/dashboard/jobs">
                <Calendar className="mr-2 h-4 w-4" />
                View Scheduled Jobs
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest automation events and commits</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/activity">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {activityLoading ? (
            <div className="p-8 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activity && activity.length > 0 ? (
            <div className="divide-y">
              {activity.slice(0, 5).map((item) => (
                <ActivityItem key={item.id} activity={item} />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
              <p className="text-sm">Activity will appear here once automation starts</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
