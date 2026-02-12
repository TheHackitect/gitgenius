'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RefreshCw,
  Flame,
  TrendingUp,
  Calendar,
  GitCommit,
  Award,
  Target,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, getDay } from 'date-fns';

interface ContributionDay {
  date: string;
  count: number;
  level: number;
}

interface AnalyticsData {
  totalCommits: number;
  commitsThisWeek: number;
  commitsThisMonth: number;
  currentStreak: number;
  longestStreak: number;
  averagePerDay: number;
  mostActiveDay: string;
  contributions: ContributionDay[];
  weeklyBreakdown: { day: string; count: number }[];
  monthlyBreakdown: { month: string; count: number }[];
}

async function fetchAnalytics(): Promise<AnalyticsData> {
  const [statsRes, contributionsRes] = await Promise.all([
    fetch('/api/dashboard/stats'),
    fetch('/api/analytics/contributions'),
  ]);

  if (!statsRes.ok || !contributionsRes.ok) {
    throw new Error('Failed to fetch analytics');
  }

  const stats = await statsRes.json();
  const contributions = await contributionsRes.json();

  // Calculate weekly breakdown
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyBreakdown = dayNames.map((day, index) => {
    const dayCommits = contributions.filter(
      (c: ContributionDay) => getDay(new Date(c.date)) === index
    );
    return {
      day,
      count: dayCommits.reduce((sum: number, c: ContributionDay) => sum + c.count, 0),
    };
  });

  // Find most active day
  const mostActiveDay = weeklyBreakdown.reduce(
    (max, day) => (day.count > max.count ? day : max),
    weeklyBreakdown[0]
  );

  return {
    totalCommits: stats.totalCommits || 0,
    commitsThisWeek: stats.commitsThisWeek || 0,
    commitsThisMonth: contributions
      .filter((c: ContributionDay) => {
        const date = new Date(c.date);
        const start = startOfMonth(new Date());
        return date >= start;
      })
      .reduce((sum: number, c: ContributionDay) => sum + c.count, 0),
    currentStreak: stats.currentStreak || 0,
    longestStreak: stats.longestStreak || 0,
    averagePerDay:
      contributions.length > 0
        ? Math.round(
            contributions.reduce((sum: number, c: ContributionDay) => sum + c.count, 0) /
              contributions.length
          )
        : 0,
    mostActiveDay: mostActiveDay?.day || 'N/A',
    contributions,
    weeklyBreakdown,
    monthlyBreakdown: [],
  };
}

function ContributionCalendar({ contributions }: { contributions: ContributionDay[] }) {
  // Create a full year calendar
  const today = new Date();
  const startDate = subDays(today, 364);
  const weeks: ContributionDay[][] = [];
  let currentWeek: ContributionDay[] = [];

  // Create contribution map for quick lookup
  const contributionMap = new Map<string, ContributionDay>();
  contributions.forEach((c) => {
    contributionMap.set(c.date, c);
  });

  // Generate all days
  const allDays = eachDayOfInterval({ start: startDate, end: today });

  // Pad the first week
  const firstDayOfWeek = getDay(startDate);
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({ date: '', count: 0, level: -1 });
  }

  allDays.forEach((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const contribution = contributionMap.get(dateStr) || {
      date: dateStr,
      count: 0,
      level: 0,
    };
    currentWeek.push(contribution);

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  // Add remaining days
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  const getContributionColor = (level: number) => {
    if (level === -1) return 'bg-transparent';
    switch (level) {
      case 0:
        return 'bg-muted hover:bg-muted/80';
      case 1:
        return 'bg-green-200 dark:bg-green-900 hover:bg-green-300 dark:hover:bg-green-800';
      case 2:
        return 'bg-green-400 dark:bg-green-700 hover:bg-green-500 dark:hover:bg-green-600';
      case 3:
        return 'bg-green-500 dark:bg-green-500 hover:bg-green-600 dark:hover:bg-green-400';
      case 4:
        return 'bg-green-600 dark:bg-green-400 hover:bg-green-700 dark:hover:bg-green-300';
      default:
        return 'bg-muted';
    }
  };

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  return (
    <div className="space-y-2">
      {/* Month labels */}
      <div className="flex text-xs text-muted-foreground ml-8 gap-[52px]">
        {months.map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 text-xs text-muted-foreground pr-2">
          <span className="h-3"></span>
          <span className="h-3">Mon</span>
          <span className="h-3"></span>
          <span className="h-3">Wed</span>
          <span className="h-3"></span>
          <span className="h-3">Fri</span>
          <span className="h-3"></span>
        </div>

        {/* Contribution squares */}
        <div className="flex gap-[3px] overflow-x-auto">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[3px]">
              {week.map((day, dayIndex) => (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={cn(
                    'w-3 h-3 rounded-sm transition-colors cursor-pointer',
                    getContributionColor(day.level)
                  )}
                  title={day.date ? `${day.date}: ${day.count} contributions` : ''}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

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
    </div>
  );
}

function WeeklyChart({ data }: { data: { day: string; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end justify-between gap-2 h-40">
      {data.map((day) => (
        <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full flex flex-col items-center justify-end h-32">
            <div
              className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t transition-all"
              style={{
                height: `${(day.count / maxCount) * 100}%`,
                minHeight: day.count > 0 ? '4px' : '0',
              }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{day.day}</span>
          <span className="text-xs font-medium">{day.count}</span>
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
  className,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: fetchAnalytics,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Track your contribution history and patterns
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Commits"
          value={analytics.totalCommits}
          description="All time automated commits"
          icon={GitCommit}
        />
        <StatCard
          title="Current Streak"
          value={`${analytics.currentStreak} days`}
          description={`Longest: ${analytics.longestStreak} days`}
          icon={Flame}
          className="border-orange-200 dark:border-orange-900"
        />
        <StatCard
          title="This Week"
          value={analytics.commitsThisWeek}
          description={`Avg: ${analytics.averagePerDay}/day`}
          icon={TrendingUp}
        />
        <StatCard
          title="This Month"
          value={analytics.commitsThisMonth}
          description={`Most active: ${analytics.mostActiveDay}`}
          icon={Calendar}
        />
      </div>

      {/* Contribution Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Contribution Calendar
          </CardTitle>
          <CardDescription>
            Your automated contribution activity over the past year
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.contributions.length > 0 ? (
            <ContributionCalendar contributions={analytics.contributions} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mb-4 opacity-50" />
              <p>No contribution data yet</p>
              <p className="text-sm">Start automation to see your contributions here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Distribution</CardTitle>
            <CardDescription>Commits by day of week</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.weeklyBreakdown.some((d) => d.count > 0) ? (
              <WeeklyChart data={analytics.weeklyBreakdown} />
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Streaks & Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Achievements
            </CardTitle>
            <CardDescription>Your contribution milestones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Flame className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium">Current Streak</p>
                  <p className="text-sm text-muted-foreground">Keep it going!</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {analytics.currentStreak} days
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Award className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="font-medium">Longest Streak</p>
                  <p className="text-sm text-muted-foreground">Personal best</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {analytics.longestStreak} days
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Target className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Daily Average</p>
                  <p className="text-sm text-muted-foreground">Commits per day</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {analytics.averagePerDay}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">Most Active Day</p>
                  <p className="text-sm text-muted-foreground">Best day for commits</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {analytics.mostActiveDay}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
