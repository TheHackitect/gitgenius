'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Bell,
} from 'lucide-react';
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

interface Broadcast {
  id: string;
  title: string;
  message: string;
  icon: string | null;
  actionUrl: string | null;
  targetRole: string | null;
  status: string;
  totalSent: number;
  totalRead: number;
  sentAt: string | null;
  createdAt: string;
}

export default function AdminBroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    icon: '📢',
    actionUrl: '',
    targetRole: '',
    sendNow: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchBroadcasts = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/broadcasts');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setBroadcasts(data.broadcasts);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load broadcasts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBroadcasts();
  }, [fetchBroadcasts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.message) {
      toast({
        title: 'Error',
        description: 'Title and message are required',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create broadcast');
      }

      toast({
        title: 'Success',
        description: formData.sendNow 
          ? 'Broadcast sent successfully' 
          : 'Broadcast created as draft',
      });

      setShowCreateDialog(false);
      setFormData({
        title: '',
        message: '',
        icon: '📢',
        actionUrl: '',
        targetRole: '',
        sendNow: true,
      });
      fetchBroadcasts();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create broadcast',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />Scheduled</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Broadcast Notifications</h1>
          <p className="text-muted-foreground">
            Send push notifications to all or filtered users
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Broadcast
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Broadcast</DialogTitle>
              <DialogDescription>
                Send a notification to all users or a specific group
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Notification title"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Message (Markdown supported)</Label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Write your message here..."
                  className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon (Emoji)</Label>
                  <Input
                    id="icon"
                    value={formData.icon}
                    onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                    placeholder="📢"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="targetRole">Target Role</Label>
                  <select
                    id="targetRole"
                    value={formData.targetRole}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetRole: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All Users</option>
                    <option value="user">Users Only</option>
                    <option value="admin">Admins Only</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="actionUrl">Action URL (optional)</Label>
                <Input
                  id="actionUrl"
                  value={formData.actionUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, actionUrl: e.target.value }))}
                  placeholder="/dashboard or https://..."
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendNow"
                  checked={formData.sendNow}
                  onChange={(e) => setFormData(prev => ({ ...prev, sendNow: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="sendNow" className="cursor-pointer">
                  Send immediately
                </Label>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <span className="animate-spin">...</span>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {formData.sendNow ? 'Send Now' : 'Save Draft'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Broadcasts List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No broadcasts yet</p>
              <p className="text-sm">Create your first broadcast notification</p>
            </div>
          ) : (
            <div className="divide-y">
              {broadcasts.map((broadcast) => (
                <div key={broadcast.id} className="p-4 hover:bg-accent/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{broadcast.icon || '📢'}</div>
                      <div>
                        <div className="font-medium">{broadcast.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {broadcast.message}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>
                            {new Date(broadcast.createdAt).toLocaleDateString()}
                          </span>
                          {broadcast.targetRole && (
                            <span>Target: {broadcast.targetRole}</span>
                          )}
                          {broadcast.totalSent > 0 && (
                            <span>Sent to {broadcast.totalSent} users</span>
                          )}
                          {broadcast.totalRead > 0 && (
                            <span>{broadcast.totalRead} read</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      {getStatusBadge(broadcast.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
