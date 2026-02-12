'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  GitCommit,
  User,
  GitBranch,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ActivityLog {
  id: string;
  type: string;
  message: string;
  details: any;
  status: string;
  repositoryName: string | null;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
  };
  gitHubAccount?: {
    username: string;
  } | null;
}

async function fetchActivity(page: number, limit: number, status?: string): Promise<{
  logs: ActivityLog[];
  total: number;
  hasMore: boolean;
}> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (status && status !== 'all') {
    params.set('status', status);
  }

  const res = await fetch(`/api/analytics/activity?${params}`);
  if (!res.ok) throw new Error('Failed to fetch activity');
  const data = await res.json();
  const logs = data.logs || [];
  
  return {
    logs,
    total: data.pagination?.total || logs.length,
    hasMore: data.pagination?.page < data.pagination?.totalPages,
  };
}

function ActivityIcon({ type, status }: { type: string; status: string }) {
  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-500 bg-green-500/10';
      case 'failed':
        return 'text-red-500 bg-red-500/10';
      case 'pending':
        return 'text-yellow-500 bg-yellow-500/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'commit':
        return GitCommit;
      case 'sync':
        return RefreshCw;
      case 'auth':
        return User;
      case 'repo':
        return GitBranch;
      default:
        return AlertCircle;
    }
  };

  const Icon = getIcon();

  return (
    <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0', getStatusColor())}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    success: 'default',
    failed: 'destructive',
    pending: 'secondary',
  };

  const labels: Record<string, string> = {
    success: 'Success',
    failed: 'Failed',
    pending: 'Pending',
  };

  return (
    <Badge variant={variants[status] || 'outline'}>
      {labels[status] || status}
    </Badge>
  );
}

export default function ActivityPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 20;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['activity', page, statusFilter],
    queryFn: () => fetchActivity(page, limit, statusFilter),
    placeholderData: (prev) => prev,
  });

  const filteredLogs = data?.logs.filter((log) =>
    searchQuery
      ? log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.repositoryName?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
        <p className="text-muted-foreground">
          Monitor all automation events and system activity
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search activity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="success">Success</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Activity List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Showing {filteredLogs?.length || 0} events
            {isFetching && <RefreshCw className="inline ml-2 h-3 w-3 animate-spin" />}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <div className="divide-y">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <ActivityIcon type={log.type} status={log.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium">{log.message}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {log.repositoryName && (
                              <Badge variant="outline" className="text-xs">
                                {log.repositoryName}
                              </Badge>
                            )}
                            {log.gitHubAccount && (
                              <span className="text-xs text-muted-foreground">
                                @{log.gitHubAccount.username}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })})
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={log.status} />
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-2 p-2 rounded bg-muted/50 text-xs font-mono">
                          {JSON.stringify(log.details, null, 2).slice(0, 200)}
                          {JSON.stringify(log.details).length > 200 && '...'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
              <p>No activity found</p>
              <p className="text-sm">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Activity will appear here once automation starts'}
              </p>
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {data && (data.hasMore || page > 1) && (
          <div className="flex items-center justify-between p-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!data.hasMore}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
