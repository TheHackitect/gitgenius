'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Github, 
  GitBranch, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  GitCommit,
  TrendingUp,
} from 'lucide-react';

interface AdminStats {
  users: {
    total: number;
    active: number;
    newLast24h: number;
    newLast7d: number;
    newLast30d: number;
  };
  github: {
    accounts: number;
    repositories: number;
  };
  jobs: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
  };
  commits: {
    total: number;
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: 'Total Users',
      value: stats.users.total,
      description: `${stats.users.active} active`,
      icon: Users,
      color: 'text-blue-500',
    },
    {
      title: 'New Users (24h)',
      value: stats.users.newLast24h,
      description: `${stats.users.newLast7d} this week`,
      icon: TrendingUp,
      color: 'text-green-500',
    },
    {
      title: 'GitHub Accounts',
      value: stats.github.accounts,
      description: 'Connected accounts',
      icon: Github,
      color: 'text-purple-500',
    },
    {
      title: 'Repositories',
      value: stats.github.repositories,
      description: 'Tracked repos',
      icon: GitBranch,
      color: 'text-orange-500',
    },
    {
      title: 'Total Jobs',
      value: stats.jobs.total,
      description: `${stats.jobs.pending} pending`,
      icon: Clock,
      color: 'text-yellow-500',
    },
    {
      title: 'Completed Jobs',
      value: stats.jobs.completed,
      description: 'Successfully executed',
      icon: CheckCircle2,
      color: 'text-green-500',
    },
    {
      title: 'Failed Jobs',
      value: stats.jobs.failed,
      description: 'Needs attention',
      icon: XCircle,
      color: 'text-red-500',
    },
    {
      title: 'Total Commits',
      value: stats.commits.total,
      description: 'Automated commits',
      icon: GitCommit,
      color: 'text-primary',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of GitGenius platform statistics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stat.value.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <a
            href="/admin/users"
            className="flex items-center gap-3 p-4 rounded-lg bg-accent hover:bg-accent/80 transition-colors"
          >
            <Users className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">Manage Users</div>
              <div className="text-sm text-muted-foreground">
                View and manage all users
              </div>
            </div>
          </a>
          
          <a
            href="/admin/broadcasts"
            className="flex items-center gap-3 p-4 rounded-lg bg-accent hover:bg-accent/80 transition-colors"
          >
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">Send Broadcast</div>
              <div className="text-sm text-muted-foreground">
                Notify all users
              </div>
            </div>
          </a>
          
          <a
            href="/api/admin/users/export?fields=id,email,name,role,isActive,createdAt"
            className="flex items-center gap-3 p-4 rounded-lg bg-accent hover:bg-accent/80 transition-colors"
          >
            <GitBranch className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">Export Users</div>
              <div className="text-sm text-muted-foreground">
                Download user data CSV
              </div>
            </div>
          </a>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>User Growth</CardTitle>
          <CardDescription>New user registrations over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last 24 hours</span>
              <span className="font-medium">{stats.users.newLast24h} users</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last 7 days</span>
              <span className="font-medium">{stats.users.newLast7d} users</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last 30 days</span>
              <span className="font-medium">{stats.users.newLast30d} users</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
