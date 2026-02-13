'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  GitCommit, 
  TrendingUp,
  Activity,
  Calendar,
  Clock,
} from 'lucide-react';

interface AnalyticsData {
  dailyActivity: {
    date: string;
    jobs: number;
    commits: number;
    users: number;
  }[];
  topUsers: {
    id: string;
    name: string;
    email: string;
    jobCount: number;
    commitCount: number;
  }[];
  jobsByStatus: {
    status: string;
    count: number;
  }[];
  hourlyDistribution: {
    hour: number;
    count: number;
  }[];
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`/api/admin/analytics?range=${timeRange}`);
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Platform performance and usage statistics</p>
        </div>
        <div className="flex gap-2">
          {['24h', '7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.dailyActivity?.[0]?.jobs || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commits Today</CardTitle>
            <GitCommit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.dailyActivity?.[0]?.commits || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users Today</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.dailyActivity?.[0]?.users || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Hour</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.hourlyDistribution?.reduce((max, curr) => 
                curr.count > (max?.count || 0) ? curr : max, { hour: 0, count: 0 }
              )?.hour || 0}:00
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Job Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Job Status Distribution</CardTitle>
            <CardDescription>Breakdown of jobs by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.jobsByStatus?.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      item.status === 'completed' ? 'bg-green-500' :
                      item.status === 'failed' ? 'bg-red-500' :
                      item.status === 'pending' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`} />
                    <span className="capitalize">{item.status}</span>
                  </div>
                  <span className="font-mono text-sm">{item.count}</span>
                </div>
              )) || (
                <p className="text-muted-foreground text-sm">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Users */}
        <Card>
          <CardHeader>
            <CardTitle>Top Active Users</CardTitle>
            <CardDescription>Users with most activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.topUsers?.slice(0, 5).map((user, index) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground w-4">{index + 1}.</span>
                    <div>
                      <p className="font-medium text-sm">{user.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p>{user.jobCount} jobs</p>
                    <p className="text-muted-foreground">{user.commitCount} commits</p>
                  </div>
                </div>
              )) || (
                <p className="text-muted-foreground text-sm">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Daily Activity
          </CardTitle>
          <CardDescription>Jobs and commits over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics?.dailyActivity?.slice(0, 14).reverse().map((day) => (
              <div key={day.date} className="flex items-center gap-4">
                <span className="w-24 text-sm text-muted-foreground">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <div className="flex-1 flex items-center gap-2">
                  <div 
                    className="h-4 bg-primary/20 rounded"
                    style={{ width: `${Math.min((day.jobs / 100) * 100, 100)}%` }}
                  />
                  <span className="text-xs text-muted-foreground w-16">{day.jobs} jobs</span>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <div 
                    className="h-4 bg-green-500/20 rounded"
                    style={{ width: `${Math.min((day.commits / 100) * 100, 100)}%` }}
                  />
                  <span className="text-xs text-muted-foreground w-20">{day.commits} commits</span>
                </div>
              </div>
            )) || (
              <p className="text-muted-foreground text-sm py-8 text-center">No activity data available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
