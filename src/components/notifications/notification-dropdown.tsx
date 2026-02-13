'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Loader2,
  GitCommit,
  AlertCircle,
  Flame,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  icon?: string;
  resourceType?: string;
  resourceId?: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  hasMore: boolean;
  nextCursor: string | null;
}

async function fetchNotifications(): Promise<NotificationsResponse> {
  const res = await fetch('/api/notifications?limit=20');
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

async function markAllAsRead(): Promise<void> {
  const res = await fetch('/api/notifications', { method: 'PATCH' });
  if (!res.ok) throw new Error('Failed to mark as read');
}

async function markOneAsRead(id: string): Promise<void> {
  const res = await fetch(`/api/notifications/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isRead: true }),
  });
  if (!res.ok) throw new Error('Failed to mark as read');
}

async function archiveNotification(id: string): Promise<void> {
  const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to archive');
}

function getNotificationIcon(type: string, iconEmoji?: string) {
  if (iconEmoji) {
    return <span className="text-lg">{iconEmoji}</span>;
  }

  switch (type) {
    case 'job_completed':
      return <Check className="h-4 w-4 text-green-500" />;
    case 'job_failed':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'job_cancelled':
      return <X className="h-4 w-4 text-orange-500" />;
    case 'streak_milestone':
      return <Flame className="h-4 w-4 text-orange-500" />;
    case 'account_warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onArchive,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const icon = getNotificationIcon(notification.type, notification.icon);
  const time = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });

  const content = (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg transition-colors group',
        notification.isRead ? 'bg-transparent' : 'bg-primary/5',
        'hover:bg-accent'
      )}
    >
      <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', !notification.isRead && 'text-foreground')}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
        <p className="text-xs text-muted-foreground mt-1">{time}</p>
      </div>
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        {!notification.isRead && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onArchive(notification.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  if (notification.actionUrl) {
    return (
      <Link href={notification.actionUrl} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: isOpen,
  });

  // Also poll for unread count when dropdown is closed
  const { data: countData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: fetchNotifications,
    refetchInterval: 60000, // Refetch every minute
    enabled: !isOpen,
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const markOneReadMutation = useMutation({
    mutationFn: markOneAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: archiveNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const unreadCount = (isOpen ? data?.unreadCount : countData?.unreadCount) || 0;
  const notifications = data?.notifications || [];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-medium bg-red-500 text-white rounded-full flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications list */}
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground">
                You&apos;re all caught up!
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={(id) => markOneReadMutation.mutate(id)}
                  onArchive={(id) => archiveMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <Link
              href="/dashboard/notifications"
              className="text-xs text-primary hover:underline"
              onClick={() => setIsOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
