'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, ShieldCheck, ShieldX, Clock, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';

interface VerificationSession {
  id: string;
  requestedType: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  holderDid: string | null;
  createdAt: string;
}

export default function VerifierSessionsPage() {
  const [sessions, setSessions] = useState<VerificationSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<VerificationSession[]>('/verifier/sessions')
      .then(res => setSessions(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SessionsSkeleton />;

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Verification Sessions</h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          History of all credential verification requests you have created.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center'>
          <div className='mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground'>
            <ClipboardList className='h-6 w-6' />
          </div>
          <h3 className='font-semibold'>No sessions yet</h3>
          <p className='mt-1.5 text-sm text-muted-foreground'>
            Create a verification request on the{' '}
            <Link href='/verifier' className='underline text-accent'>
              Dashboard
            </Link>{' '}
            to get started.
          </p>
        </div>
      ) : (
        <div className='space-y-3'>
          {sessions.map(session => (
            <SessionRow key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionRow({ session }: { session: VerificationSession }) {
  const statusConfig = {
    PENDING: {
      label: 'Pending',
      icon: Clock,
      badge: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    VERIFIED: {
      label: 'Verified',
      icon: ShieldCheck,
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    REJECTED: {
      label: 'Rejected',
      icon: ShieldX,
      badge: 'bg-destructive/10 text-destructive border-destructive/20',
    },
  }[session.status];

  const StatusIcon = statusConfig.icon;

  return (
    <Link href={`/verifier/sessions/${session.id}`}>
      <Card className='flex items-center justify-between gap-4 p-4 hover:border-accent/40 transition-colors cursor-pointer'>
        <div className='flex items-center gap-3 min-w-0'>
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              session.status === 'VERIFIED'
                ? 'bg-emerald-100 text-emerald-600'
                : session.status === 'REJECTED'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-amber-100 text-amber-600'
            }`}
          >
            <StatusIcon className='h-4 w-4' />
          </div>
          <div className='min-w-0'>
            <div className='font-medium text-sm truncate'>{session.requestedType}</div>
            <div className='text-xs text-muted-foreground mt-0.5'>
              {session.holderDid ? (
                <span className='font-mono truncate block'>{session.holderDid}</span>
              ) : (
                <span>No holder yet</span>
              )}
            </div>
          </div>
        </div>
        <div className='flex items-center gap-3 shrink-0'>
          <div className='text-right hidden sm:block'>
            <Badge className={statusConfig.badge}>{statusConfig.label}</Badge>
            <div className='text-xs text-muted-foreground mt-1'>
              {formatDate(session.createdAt)}
            </div>
          </div>
          <ChevronRight className='h-4 w-4 text-muted-foreground' />
        </div>
      </Card>
    </Link>
  );
}

function SessionsSkeleton() {
  return (
    <div className='space-y-6'>
      <div>
        <Skeleton className='h-7 w-52' />
        <Skeleton className='mt-2 h-4 w-80' />
      </div>
      <div className='space-y-3'>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className='h-16' />
        ))}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
