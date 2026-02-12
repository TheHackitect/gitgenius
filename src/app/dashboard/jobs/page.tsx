'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  Trash2,
  Calendar,
  Timer,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AutomationJob {
  id: string;
  status: string;
  scheduledFor: string;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  commitCount: number;
  createdAt: string;
  githubAccount?: {
    username: string;
  };
  automationConfig?: {
    name: string;
    gitHubAccount: {
      username: string;
    };
  };
}

async function fetchJobs(): Promise<AutomationJob[]> {
  const res = await fetch('/api/automation/jobs');
  if (!res.ok) throw new Error('Failed to fetch jobs');
  const data = await res.json();
  return data.jobs || [];
}

function JobStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'running':
      return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'cancelled':
      return <Pause className="h-4 w-4 text-muted-foreground" />;
    default:
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
}

function JobStatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    completed: 'default',
    failed: 'destructive',
    running: 'secondary',
    pending: 'outline',
    cancelled: 'secondary',
  };

  const colors: Record<string, string> = {
    completed: 'bg-green-500',
    running: 'bg-blue-500 animate-pulse',
  };

  return (
    <Badge variant={variants[status] || 'outline'} className={colors[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function JobsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['automation-jobs'],
    queryFn: fetchJobs,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Cancel job mutation
  const cancelJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch(`/api/automation/jobs?jobId=${jobId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to cancel job');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-jobs'] });
      toast({
        title: 'Job cancelled',
        description: 'The job has been cancelled successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Run job now mutation
  const runNowMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch('/api/automation/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, action: 'run_now' }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to run job');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-jobs'] });
      toast({
        title: 'Job started',
        description: 'The job is now running.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Retry job mutation
  const retryJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch('/api/automation/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, action: 'retry' }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to retry job');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-jobs'] });
      toast({
        title: 'Job retrying',
        description: 'The job has been queued for retry.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCancel = (jobId: string) => cancelJobMutation.mutate(jobId);
  const handleRunNow = (jobId: string) => runNowMutation.mutate(jobId);
  const handleRetry = (jobId: string) => retryJobMutation.mutate(jobId);

  const pendingJobs = jobs?.filter((j) => j.status === 'pending') || [];
  const runningJobs = jobs?.filter((j) => j.status === 'running') || [];
  const completedJobs = jobs?.filter((j) => j.status === 'completed') || [];
  const failedJobs = jobs?.filter((j) => j.status === 'failed') || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scheduled Jobs</h1>
        <p className="text-muted-foreground">
          Monitor and manage your automation jobs
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pending
            </CardDescription>
            <CardTitle className="text-3xl">{pendingJobs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-500" />
              Running
            </CardDescription>
            <CardTitle className="text-3xl">{runningJobs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Completed
            </CardDescription>
            <CardTitle className="text-3xl">{completedJobs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Failed
            </CardDescription>
            <CardTitle className="text-3xl">{failedJobs.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Jobs List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All ({jobs?.length || 0})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingJobs.length})</TabsTrigger>
          <TabsTrigger value="running">Running ({runningJobs.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedJobs.length})</TabsTrigger>
          <TabsTrigger value="failed">Failed ({failedJobs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <JobsList jobs={jobs || []} onCancel={handleCancel} onRunNow={handleRunNow} onRetry={handleRetry} />
        </TabsContent>
        <TabsContent value="pending">
          <JobsList jobs={pendingJobs} onCancel={handleCancel} onRunNow={handleRunNow} onRetry={handleRetry} />
        </TabsContent>
        <TabsContent value="running">
          <JobsList jobs={runningJobs} onCancel={handleCancel} onRunNow={handleRunNow} onRetry={handleRetry} />
        </TabsContent>
        <TabsContent value="completed">
          <JobsList jobs={completedJobs} onCancel={handleCancel} onRunNow={handleRunNow} onRetry={handleRetry} />
        </TabsContent>
        <TabsContent value="failed">
          <JobsList jobs={failedJobs} onCancel={handleCancel} onRunNow={handleRunNow} onRetry={handleRetry} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface JobsListProps {
  jobs: AutomationJob[];
  onCancel: (jobId: string) => void;
  onRunNow: (jobId: string) => void;
  onRetry: (jobId: string) => void;
}

function JobsList({ jobs, onCancel, onRunNow, onRetry }: JobsListProps) {
  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">No jobs found</h3>
          <p className="text-sm text-muted-foreground text-center">
            Jobs will appear here when automation runs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <Card key={job.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <JobStatusIcon status={job.status} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{job.automationConfig?.name ?? 'Unknown Config'}</span>
                    <JobStatusBadge status={job.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    @{job.automationConfig?.gitHubAccount?.username ?? job.githubAccount?.username ?? 'Unknown'}
                  </p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Scheduled: {format(new Date(job.scheduledFor), 'MMM d, yyyy HH:mm')}
                      </span>
                    </div>
                    {job.startedAt && (
                      <div className="flex items-center gap-1">
                        <Play className="h-3 w-3" />
                        <span>
                          Started: {formatDistanceToNow(new Date(job.startedAt), { addSuffix: true })}
                        </span>
                      </div>
                    )}
                    {job.completedAt && (
                      <div className="flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        <span>
                          Completed: {formatDistanceToNow(new Date(job.completedAt), { addSuffix: true })}
                        </span>
                      </div>
                    )}
                    {job.commitCount > 0 && (
                      <div className="flex items-center gap-1 text-green-500">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{job.commitCount} commits</span>
                      </div>
                    )}
                  </div>

                  {job.error && (
                    <div className="mt-2 p-2 rounded bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-xs">
                      {job.error}
                    </div>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {job.status === 'pending' && (
                    <>
                      <DropdownMenuItem onClick={() => onRunNow(job.id)}>
                        <Play className="mr-2 h-4 w-4" />
                        Run Now
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => onCancel(job.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Cancel
                      </DropdownMenuItem>
                    </>
                  )}
                  {job.status === 'failed' && (
                    <DropdownMenuItem onClick={() => onRetry(job.id)}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
