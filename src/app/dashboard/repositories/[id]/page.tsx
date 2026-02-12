'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import {
  RefreshCw,
  ArrowLeft,
  ExternalLink,
  GitBranch,
  GitCommit,
  Lock,
  Unlock,
  Star,
  GitFork,
  Calendar,
  Save,
  Settings2,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';

interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  isPrivate: boolean;
  defaultBranch: string;
  language: string | null;
  stars: number;
  forks: number;
  isAutomationEnabled: boolean;
  lastPushedAt: string | null;
  createdAt: string;
  updatedAt: string;
  githubAccount?: {
    id: string;
    username: string;
  };
  _count?: {
    commits: number;
  };
  commits?: {
    id: string;
    sha: string;
    message: string;
    status: string;
    committedAt: string;
  }[];
}

async function fetchRepository(id: string): Promise<Repository> {
  const res = await fetch(`/api/repositories/${id}`);
  if (!res.ok) throw new Error('Failed to fetch repository');
  const data = await res.json();
  return data.repository;
}

export default function RepositoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const repoId = params.id as string;

  const { data: repo, isLoading } = useQuery({
    queryKey: ['repository', repoId],
    queryFn: () => fetchRepository(repoId),
  });

  const [settings, setSettings] = useState({
    isAutomationEnabled: false,
  });

  // Sync settings state when repo data loads
  useEffect(() => {
    if (repo) {
      setSettings({
        isAutomationEnabled: repo.isAutomationEnabled ?? false,
      });
    }
  }, [repo]);

  const updateRepoMutation = useMutation({
    mutationFn: async (data: { isAutomationEnabled: boolean }) => {
      const res = await fetch(`/api/repositories/${repoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update repository');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repository', repoId] });
      toast({
        title: 'Repository updated',
        description: 'Settings have been saved.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update repository.',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Repository not found</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/dashboard/repositories">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Repositories
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="mb-2" asChild>
            <Link href="/dashboard/repositories">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{repo.fullName}</h1>
            {repo.isPrivate ? (
              <Badge variant="secondary">
                <Lock className="mr-1 h-3 w-3" />
                Private
              </Badge>
            ) : (
              <Badge variant="outline">
                <Unlock className="mr-1 h-3 w-3" />
                Public
              </Badge>
            )}
            {repo.isAutomationEnabled && <Badge>Automation Active</Badge>}
          </div>
          {repo.description && (
            <p className="text-muted-foreground mt-2">{repo.description}</p>
          )}
        </div>
        <Button variant="outline" asChild>
          <a
            href={`https://github.com/${repo.fullName}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View on GitHub
          </a>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <GitCommit className="h-4 w-4" />
              Automated Commits
            </CardDescription>
            <CardTitle className="text-3xl">{repo._count?.commits ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Stars
            </CardDescription>
            <CardTitle className="text-3xl">{repo.stars}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <GitFork className="h-4 w-4" />
              Forks
            </CardDescription>
            <CardTitle className="text-3xl">{repo.forks}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Default Branch
            </CardDescription>
            <CardTitle className="text-xl">{repo.defaultBranch}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Automation Settings
            </CardTitle>
            <CardDescription>
              Configure automation for this repository
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Automation</Label>
                <p className="text-sm text-muted-foreground">
                  Allow automated commits to this repository
                </p>
              </div>
              <Switch
                checked={settings.isAutomationEnabled}
                onCheckedChange={(checked: boolean) =>
                  setSettings({ ...settings, isAutomationEnabled: checked })
                }
              />
            </div>

            <Button
              onClick={() => updateRepoMutation.mutate(settings)}
              disabled={updateRepoMutation.isPending}
            >
              {updateRepoMutation.isPending && (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
          </CardContent>
        </Card>

        {/* Repository Info */}
        <Card>
          <CardHeader>
            <CardTitle>Repository Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Owner</dt>
                <dd className="font-medium">@{repo.githubAccount?.username}</dd>
              </div>
              {repo.language && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Language</dt>
                  <dd className="font-medium">{repo.language}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-medium">
                  {format(new Date(repo.createdAt), 'MMM d, yyyy')}
                </dd>
              </div>
              {repo.lastPushedAt && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Last Commit</dt>
                  <dd className="font-medium">
                    {formatDistanceToNow(new Date(repo.lastPushedAt), { addSuffix: true })}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Recent Commits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCommit className="h-5 w-5" />
            Recent Automated Commits
          </CardTitle>
          <CardDescription>
            Latest commits made by GitGenius
          </CardDescription>
        </CardHeader>
        <CardContent>
          {repo.commits && repo.commits.length > 0 ? (
            <div className="space-y-3">
              {repo.commits.slice(0, 10).map((commit) => (
                <div
                  key={commit.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{commit.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs text-muted-foreground">
                        {commit.sha?.substring(0, 7)}
                      </code>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(commit.committedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <Badge variant={commit.status === 'success' ? 'default' : 'secondary'}>
                    {commit.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <GitCommit className="h-8 w-8 mb-2 opacity-50" />
              <p>No automated commits yet</p>
              <p className="text-sm">
                Enable automation to start generating commits
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
