'use client';

import { useEffect, useState } from 'react';
import {
  Bell,
  CheckCheck,
  FileCheck,
  ShieldCheck,
  Trash2,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

type NotificationType = 'ISSUANCE' | 'VERIFICATION' | 'WARNING' | 'SYSTEM';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ReactNode; variant: 'success' | 'default' | 'warning' | 'secondary'; label: string }
> = {
  ISSUANCE: {
    icon: <FileCheck className='h-4 w-4' />,
    variant: 'success',
    label: 'Issuance',
  },
  VERIFICATION: {
    icon: <ShieldCheck className='h-4 w-4' />,
    variant: 'default',
    label: 'Verification',
  },
  WARNING: {
    icon: <AlertTriangle className='h-4 w-4' />,
    variant: 'warning',
    label: 'Warning',
  },
  SYSTEM: {
    icon: <Settings className='h-4 w-4' />,
    variant: 'secondary',
    label: 'System',
  },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get<Notification[]>('/notifications');
      setNotifications(res.data);
    } catch {
      // Лишаємо порожній список
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      // Ігноруємо помилку — UI вже оновився оптимістично
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    const unread = notifications.filter(n => !n.isRead);
    try {
      await Promise.all(unread.map(n => api.patch(`/notifications/${n.id}/read`)));
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {
      // Часткове оновлення — перезавантажуємо
      await fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) return <NotificationsSkeleton />;

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Notifications</h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant='outline' size='sm' onClick={handleMarkAllAsRead} disabled={markingAll}>
            <CheckCheck className='h-4 w-4' />
            {markingAll ? 'Marking...' : 'Mark all as read'}
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center'>
          <div className='mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground'>
            <Bell className='h-6 w-6' />
          </div>
          <h3 className='font-semibold text-foreground'>No notifications yet</h3>
          <p className='mt-1.5 max-w-sm text-sm text-muted-foreground'>
            You&apos;ll see updates here when credentials are issued, verified, or when system
            events occur.
          </p>
        </div>
      ) : (
        <div className='space-y-2'>
          {notifications.map(notification => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  onMarkAsRead,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}) {
  const config = TYPE_CONFIG[notification.type];

  return (
    <Card
      className={cn(
        'flex items-start gap-4 p-4 transition-colors',
        !notification.isRead && 'bg-accent/5 border-accent/20',
      )}
    >
      {/* Тип іконка */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          notification.type === 'ISSUANCE' && 'bg-emerald-500/10 text-emerald-600',
          notification.type === 'VERIFICATION' && 'bg-primary/10 text-primary',
          notification.type === 'WARNING' && 'bg-amber-500/10 text-amber-600',
          notification.type === 'SYSTEM' && 'bg-muted text-muted-foreground',
        )}
      >
        {config.icon}
      </div>

      {/* Контент */}
      <div className='min-w-0 flex-1'>
        <div className='flex items-start justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <span className='font-medium leading-snug'>{notification.title}</span>
            {!notification.isRead && <span className='h-2 w-2 shrink-0 rounded-full bg-accent' />}
          </div>
          <Badge variant={config.variant} className='shrink-0 text-xs'>
            {config.label}
          </Badge>
        </div>
        <p className='mt-1 text-sm text-muted-foreground leading-relaxed'>{notification.message}</p>
        <div className='mt-2 flex items-center justify-between gap-2'>
          <span className='text-xs text-muted-foreground'>
            {formatDate(notification.createdAt)}
          </span>
          {!notification.isRead && (
            <button
              onClick={() => onMarkAsRead(notification.id)}
              className='text-xs text-accent hover:text-accent/80 transition-colors underline underline-offset-2'
            >
              Mark as read
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function NotificationsSkeleton() {
  return (
    <div className='space-y-6'>
      <div>
        <Skeleton className='h-7 w-40' />
        <Skeleton className='mt-2 h-4 w-48' />
      </div>
      <div className='space-y-2'>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className='h-24' />
        ))}
      </div>
    </div>
  );
}
