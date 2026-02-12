'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  RefreshCw,
  Search,
  ExternalLink,
  GitBranch,
  Lock,
  Unlock,
  Star,
  GitFork,
  Settings2,
  MoreVertical,
  ChevronRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  isPrivate: boolean;
  defaultBranch: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  automationEnabled: boolean;
  lastCommitAt: string | null;
  updatedAt: string;
  gitHubAccount: {
    username: string;
  };
  _count: {
    commitRecords: number;
  };
}

async function fetchRepositories(): Promise<Repository[]> {
  const res = await fetch('/api/repositories');
  if (!res.ok) throw new Error('Failed to fetch repositories');
  const data = await res.json();
  return data.repositories || [];
}

const languageColors: Record<string, string> = {
  TypeScript: 'bg-blue-500',
  JavaScript: 'bg-yellow-400',
  Python: 'bg-green-500',
  Rust: 'bg-orange-500',
  Go: 'bg-cyan-500',
  Java: 'bg-red-500',
  'C++': 'bg-pink-500',
  C: 'bg-gray-500',
  Ruby: 'bg-red-600',
  PHP: 'bg-purple-500',
  Swift: 'bg-orange-400',
  Kotlin: 'bg-purple-400',
  default: 'bg-gray-400',
};

export default function RepositoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: repositories, isLoading } = useQuery({
    queryKey: ['repositories'],
    queryFn: fetchRepositories,
  });

  const toggleAutomationMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await fetch(`/api/repositories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automationEnabled: enabled }),
      });
      if (!res.ok) throw new Error('Failed to update repository');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update automation settings.',
        variant: 'destructive',
      });
    },
  });

  const filteredRepos = repositories?.filter((repo) => {
    const matchesSearch =
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'active') return matchesSearch && repo.automationEnabled;
    if (activeTab === 'inactive') return matchesSearch && !repo.automationEnabled;
    return matchesSearch;
  });

  const stats = {
    total: repositories?.length || 0,
    active: repositories?.filter((r) => r.automationEnabled).length || 0,
    inactive: repositories?.filter((r) => !r.automationEnabled).length || 0,
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Repositories</h1>
          <p className="text-muted-foreground">
            Manage automation for your GitHub repositories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/accounts">
              <GitBranch className="mr-2 h-4 w-4" />
              Sync from Accounts
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Repositories</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Automation Enabled</CardDescription>
            <CardTitle className="text-3xl text-green-500">{stats.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Automation Disabled</CardDescription>
            <CardTitle className="text-3xl text-muted-foreground">{stats.inactive}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
            <TabsTrigger value="active">Active ({stats.active})</TabsTrigger>
            <TabsTrigger value="inactive">Inactive ({stats.inactive})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Repositories List */}
      {filteredRepos && filteredRepos.length > 0 ? (
        <div className="space-y-3">
          {filteredRepos.map((repo) => (
            <Card key={repo.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/dashboard/repositories/${repo.id}`}
                        className="font-semibold hover:text-primary transition-colors truncate"
                      >
                        {repo.fullName}
                      </Link>
                      {repo.isPrivate ? (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <Unlock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      {repo.automationEnabled && (
                        <Badge className="shrink-0">Active</Badge>
                      )}
                    </div>

                    {repo.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                        {repo.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {repo.language && (
                        <div className="flex items-center gap-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              languageColors[repo.language] || languageColors.default
                            }`}
                          />
                          <span>{repo.language}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        <span>{repo.stargazersCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <GitFork className="h-3 w-3" />
                        <span>{repo.forksCount}</span>
                      </div>
                      <span>
                        Updated {formatDistanceToNow(new Date(repo.updatedAt), { addSuffix: true })}
                      </span>
                      {repo._count.commitRecords > 0 && (
                        <span className="text-green-500">
                          {repo._count.commitRecords} automated commits
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {repo.automationEnabled ? 'On' : 'Off'}
                      </span>
                      <Switch
                        checked={repo.automationEnabled}
                        onCheckedChange={(checked) =>
                          toggleAutomationMutation.mutate({
                            id: repo.id,
                            enabled: checked,
                          })
                        }
                      />
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/repositories/${repo.id}`}>
                            <Settings2 className="mr-2 h-4 w-4" />
                            Configure
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a
                            href={`https://github.com/${repo.fullName}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View on GitHub
                          </a>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <GitBranch className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">
              {searchQuery ? 'No repositories found' : 'No repositories yet'}
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Connect a GitHub account and sync repositories to get started.'}
            </p>
            {!searchQuery && (
              <Button asChild>
                <Link href="/dashboard/accounts">
                  <GitBranch className="mr-2 h-4 w-4" />
                  Connect Account
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
