'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  Plus,
  RefreshCw,
  ExternalLink,
  Trash2,
  MoreVertical,
  GitBranch,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface GitHubAccount {
  id: string;
  username: string;
  avatarUrl: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  _count: {
    repositories: number;
  };
}

async function fetchAccounts(): Promise<GitHubAccount[]> {
  const res = await fetch('/api/github/accounts');
  if (!res.ok) throw new Error('Failed to fetch accounts');
  const data = await res.json();
  return data.accounts || [];
}

export default function AccountsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAccountData, setNewAccountData] = useState({ username: '', token: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['github-accounts'],
    queryFn: fetchAccounts,
  });

  const addAccountMutation = useMutation({
    mutationFn: async (data: { username: string; token: string }) => {
      const res = await fetch('/api/github/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: data.token }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add account');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github-accounts'] });
      setIsAddDialogOpen(false);
      setNewAccountData({ username: '', token: '' });
      toast({
        title: 'Account added',
        description: 'GitHub account has been added successfully.',
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

  const toggleAccountMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/github/accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error('Failed to update account');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github-accounts'] });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/github/accounts/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete account');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github-accounts'] });
      toast({
        title: 'Account deleted',
        description: 'GitHub account has been removed.',
      });
    },
  });

  const syncAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/github/accounts/${id}/sync`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to sync account');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['github-accounts'] });
      toast({
        title: 'Sync complete',
        description: `Synced ${data.syncedRepos} repositories.`,
      });
    },
  });

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addAccountMutation.mutateAsync(newAccountData);
    } finally {
      setIsSubmitting(false);
    }
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
          <h1 className="text-3xl font-bold tracking-tight">GitHub Accounts</h1>
          <p className="text-muted-foreground">
            Manage your connected GitHub accounts
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddAccount}>
              <DialogHeader>
                <DialogTitle>Add GitHub Account</DialogTitle>
                <DialogDescription>
                  Connect a GitHub account using a Personal Access Token (PAT).
                  The token needs repo and user scopes.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="username">GitHub Username</Label>
                  <Input
                    id="username"
                    placeholder="your-github-username"
                    value={newAccountData.username}
                    onChange={(e) =>
                      setNewAccountData({ ...newAccountData, username: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token">Personal Access Token</Label>
                  <Input
                    id="token"
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxx"
                    value={newAccountData.token}
                    onChange={(e) =>
                      setNewAccountData({ ...newAccountData, token: e.target.value })
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Create a token at{' '}
                    <a
                      href="https://github.com/settings/tokens/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      GitHub Settings
                    </a>
                    {' '}with repo and user scopes.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                  Add Account
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Personal Access Token Required
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                To add a GitHub account, you need to create a Personal Access Token (PAT) with
                <code className="mx-1 px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-xs">repo</code>
                and
                <code className="mx-1 px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-xs">user</code>
                scopes. Your token is encrypted and stored securely.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts List */}
      {accounts && accounts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((account) => (
            <Card key={account.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={account.avatarUrl || undefined} />
                      <AvatarFallback>
                        {account.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {account.username}
                        {account.isActive ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Connected {formatDistanceToNow(new Date(account.createdAt), { addSuffix: true })}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => syncAccountMutation.mutate(account.id)}
                        disabled={syncAccountMutation.isPending}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sync Repositories
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a
                          href={`https://github.com/${account.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View on GitHub
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          if (confirm('Are you sure you want to remove this account?')) {
                            deleteAccountMutation.mutate(account.id);
                          }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Account
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GitBranch className="h-4 w-4" />
                    <span>{account._count.repositories} repositories</span>
                  </div>
                  {account.lastSyncAt && (
                    <span className="text-xs text-muted-foreground">
                      Synced {formatDistanceToNow(new Date(account.lastSyncAt), { addSuffix: true })}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Automation</span>
                    <Badge variant={account.isActive ? 'default' : 'secondary'}>
                      {account.isActive ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <Switch
                    checked={account.isActive}
                    onCheckedChange={(checked) =>
                      toggleAccountMutation.mutate({ id: account.id, isActive: checked })
                    }
                  />
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
            <h3 className="font-semibold mb-1">No accounts connected</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Connect your GitHub accounts to start automating contributions.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Account
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
