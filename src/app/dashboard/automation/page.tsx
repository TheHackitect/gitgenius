'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  RefreshCw,
  Plus,
  Settings2,
  Play,
  Pause,
  Clock,
  Calendar,
  Trash2,
  Edit,
  MoreVertical,
  Zap,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutomationConfig {
  id: string;
  name: string;
  isEnabled: boolean;
  minCommitsPerDay: number;
  maxCommitsPerDay: number;
  commitMessageStyle: string;
  scheduleType: string;
  timezone: string;
  skipWeekends: boolean;
  variabilityFactor: number;
  createdAt: string;
  updatedAt: string;
  githubAccount?: {
    username: string;
  };
}

interface Repository {
  id: string;
  fullName: string;
  githubAccount?: {
    id: string;
    username: string;
  };
}

async function fetchConfigs(): Promise<AutomationConfig[]> {
  const res = await fetch('/api/automation/configs');
  if (!res.ok) throw new Error('Failed to fetch configs');
  const data = await res.json();
  return data.configs || [];
}

async function fetchRepositories(): Promise<Repository[]> {
  const res = await fetch('/api/repositories');
  if (!res.ok) throw new Error('Failed to fetch repositories');
  const data = await res.json();
  return data.repositories || [];
}

export default function AutomationPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [newConfig, setNewConfig] = useState({
    name: '',
    minCommitsPerDay: 1,
    maxCommitsPerDay: 5,
    commitMessageStyle: 'conventional',
    skipWeekends: false,
    variabilityFactor: 0.3,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: configs, isLoading } = useQuery({
    queryKey: ['automation-configs'],
    queryFn: fetchConfigs,
  });

  const { data: repositories } = useQuery({
    queryKey: ['repositories'],
    queryFn: fetchRepositories,
  });

  // Get unique accounts from repositories
  const accounts = repositories?.reduce(
    (acc, repo) => {
      if (repo.githubAccount && !acc.find((a) => a.id === repo.githubAccount!.id)) {
        acc.push(repo.githubAccount);
      }
      return acc;
    },
    [] as { id: string; username: string }[]
  );

  const createConfigMutation = useMutation({
    mutationFn: async (data: typeof newConfig & { githubAccountId: string }) => {
      const res = await fetch('/api/automation/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          name: data.name || 'Default Config',
          commitMessageStyle: data.commitMessageStyle,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create config');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-configs'] });
      setIsCreateDialogOpen(false);
      setNewConfig({
        name: '',
        minCommitsPerDay: 1,
        maxCommitsPerDay: 5,
        commitMessageStyle: 'conventional',
        skipWeekends: false,
        variabilityFactor: 0.3,
      });
      setSelectedAccountId('');
      toast({
        title: 'Configuration created',
        description: 'Your automation config has been created.',
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

  const toggleConfigMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      const res = await fetch(`/api/automation/configs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled }),
      });
      if (!res.ok) throw new Error('Failed to update config');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-configs'] });
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automation/configs/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete config');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-configs'] });
      toast({
        title: 'Configuration deleted',
        description: 'The automation config has been removed.',
      });
    },
  });

  const handleCreateConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) {
      toast({
        title: 'Error',
        description: 'Please select a GitHub account.',
        variant: 'destructive',
      });
      return;
    }
    createConfigMutation.mutate({
      ...newConfig,
      githubAccountId: selectedAccountId,
    });
  };

  const activeConfigs = configs?.filter((c) => c.isEnabled) || [];
  const inactiveConfigs = configs?.filter((c) => !c.isEnabled) || [];

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
          <h1 className="text-3xl font-bold tracking-tight">Automation</h1>
          <p className="text-muted-foreground">
            Configure and manage your commit automation rules
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Config
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <form onSubmit={handleCreateConfig}>
              <DialogHeader>
                <DialogTitle>Create Automation Config</DialogTitle>
                <DialogDescription>
                  Set up automated commits for a GitHub account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Configuration Name</Label>
                  <Input
                    id="name"
                    placeholder="Daily commits"
                    value={newConfig.name}
                    onChange={(e) =>
                      setNewConfig({ ...newConfig, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>GitHub Account</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    required
                  >
                    <option value="">Select an account</option>
                    {accounts?.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.username}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minCommits">Min Commits/Day</Label>
                    <Input
                      id="minCommits"
                      type="number"
                      min={1}
                      max={20}
                      value={newConfig.minCommitsPerDay}
                      onChange={(e) =>
                        setNewConfig({
                          ...newConfig,
                          minCommitsPerDay: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxCommits">Max Commits/Day</Label>
                    <Input
                      id="maxCommits"
                      type="number"
                      min={1}
                      max={20}
                      value={newConfig.maxCommitsPerDay}
                      onChange={(e) =>
                        setNewConfig({
                          ...newConfig,
                          maxCommitsPerDay: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Commit Style</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={newConfig.commitMessageStyle}
                    onChange={(e) =>
                      setNewConfig({ ...newConfig, commitMessageStyle: e.target.value })
                    }
                  >
                    <option value="conventional">Conventional (feat:, fix:, chore:)</option>
                    <option value="casual">Casual (Update files, Fix bug)</option>
                    <option value="technical">Technical (Implement, Refactor)</option>
                    <option value="mixed">Mixed (Random style)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="variability">Variability Factor: {newConfig.variabilityFactor}</Label>
                  <input
                    type="range"
                    id="variability"
                    min={0}
                    max={1}
                    step={0.1}
                    value={newConfig.variabilityFactor}
                    onChange={(e) =>
                      setNewConfig({
                        ...newConfig,
                        variabilityFactor: parseFloat(e.target.value),
                      })
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher values make commit patterns more random and natural
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Skip Weekends</Label>
                    <p className="text-xs text-muted-foreground">
                      Disable commits on Saturday and Sunday
                    </p>
                  </div>
                  <Switch
                    checked={newConfig.skipWeekends}
                    onCheckedChange={(checked: boolean) =>
                      setNewConfig({ ...newConfig, skipWeekends: checked })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createConfigMutation.isPending}>
                  {createConfigMutation.isPending && (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Config
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Active Configs</CardDescription>
            <Zap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{activeConfigs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Configs</CardDescription>
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{configs?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Daily Commit Range</CardDescription>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {activeConfigs.length > 0
                ? `${Math.min(...activeConfigs.map((c) => c.minCommitsPerDay))}-${Math.max(...activeConfigs.map((c) => c.maxCommitsPerDay))}`
                : '0'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configs List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All ({configs?.length || 0})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeConfigs.length})</TabsTrigger>
          <TabsTrigger value="inactive">Paused ({inactiveConfigs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <ConfigList
            configs={configs || []}
            onToggle={(id, isEnabled) => toggleConfigMutation.mutate({ id, isEnabled })}
            onDelete={(id) => deleteConfigMutation.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <ConfigList
            configs={activeConfigs}
            onToggle={(id, isEnabled) => toggleConfigMutation.mutate({ id, isEnabled })}
            onDelete={(id) => deleteConfigMutation.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          <ConfigList
            configs={inactiveConfigs}
            onToggle={(id, isEnabled) => toggleConfigMutation.mutate({ id, isEnabled })}
            onDelete={(id) => deleteConfigMutation.mutate(id)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConfigList({
  configs,
  onToggle,
  onDelete,
}: {
  configs: AutomationConfig[];
  onToggle: (id: string, isEnabled: boolean) => void;
  onDelete: (id: string) => void;
}) {
  if (configs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Settings2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">No configurations</h3>
          <p className="text-sm text-muted-foreground text-center">
            Create an automation configuration to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {configs.map((config) => (
        <Card key={config.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{config.name}</h3>
                  <Badge variant={config.isEnabled ? 'default' : 'secondary'}>
                    {config.isEnabled ? 'Active' : 'Paused'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  @{config.githubAccount?.username ?? 'Unknown'}
                </p>

                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Target className="h-3.5 w-3.5" />
                    <span>
                      {config.minCommitsPerDay}-{config.maxCommitsPerDay} commits/day
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span className="capitalize">{config.commitMessageStyle} style</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{config.timezone}</span>
                  </div>
                  {config.skipWeekends && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Skips weekends</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={config.isEnabled}
                  onCheckedChange={(checked: boolean) => onToggle(config.id, checked)}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Config
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this configuration?')) {
                          onDelete(config.id);
                        }
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
