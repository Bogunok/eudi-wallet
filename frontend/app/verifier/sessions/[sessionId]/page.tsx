'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ShieldCheck,
  ShieldX,
  Clock,
  ArrowLeft,
  RefreshCw,
  Building2,
  Hash,
  Calendar,
  FileText,
  Copy,
  Check,
  Link2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';

interface VerificationSession {
  id: string;
  requestedType: string;
  requestedFields: string[];
  purpose: string | null;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  holderDid: string | null;
  presentedData: Record<string, unknown> | null;
  nonce: string;
  walletRequestUrl: string | null;
  createdAt: string;
}

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pending',
    icon: Clock,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    iconColor: 'bg-amber-100 text-amber-600',
    description: 'Waiting for the holder to present their credential.',
  },
  VERIFIED: {
    label: 'Verified',
    icon: ShieldCheck,
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    iconColor: 'bg-emerald-100 text-emerald-600',
    description: 'The credential was successfully verified.',
  },
  REJECTED: {
    label: 'Rejected',
    icon: ShieldX,
    color: 'bg-destructive/10 text-destructive border-destructive/20',
    iconColor: 'bg-destructive/10 text-destructive',
    description: 'Verification failed — the credential could not be validated.',
  },
};

export default function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<VerificationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchSession = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await api.get<VerificationSession>(`/verifier/sessions/${sessionId}`);
      setSession(res.data);
    } catch {
      setError('Session not found or you do not have access.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  // Авто-оновлення кожні 5с
  useEffect(() => {
    if (!session || session.status !== 'PENDING') return;
    const interval = setInterval(() => fetchSession(true), 5000);
    return () => clearInterval(interval);
  }, [session?.status]);

  const handleCopy = async () => {
    if (!session?.walletRequestUrl) return;
    await navigator.clipboard.writeText(session.walletRequestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <DetailSkeleton />;

  if (error || !session) {
    return (
      <div className='space-y-6'>
        <BackButton />
        <Card className='border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive'>
          {error || 'Session not found.'}
        </Card>
      </div>
    );
  }

  const config = STATUS_CONFIG[session.status];
  const StatusIcon = config.icon;

  return (
    <div className='space-y-6'>
      {/* Back + refresh */}
      <div className='flex items-center justify-between'>
        <BackButton />
        {session.status === 'PENDING' && (
          <Button
            variant='ghost'
            size='sm'
            onClick={() => fetchSession(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>

      {/* Status */}
      <Card className='p-6'>
        <div className='flex items-start gap-4'>
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${config.iconColor}`}
          >
            <StatusIcon className='h-6 w-6' />
          </div>
          <div className='flex-1 min-w-0'>
            <div className='flex flex-wrap items-center gap-3'>
              <h1 className='text-xl font-semibold'>Session Details</h1>
              <Badge className={config.color}>{config.label}</Badge>
            </div>
            <p className='mt-1 text-sm text-muted-foreground'>{config.description}</p>
            {session.status === 'PENDING' && (
              <p className='mt-2 text-xs text-muted-foreground'>Auto-refreshing every 5 seconds…</p>
            )}
          </div>
        </div>
      </Card>

      {/* Wallet Request Link — тільки для PENDING */}
      {session.status === 'PENDING' && session.walletRequestUrl && (
        <Card className='p-6 space-y-3'>
          <div className='flex items-center gap-2'>
            <Link2 className='h-4 w-4 text-muted-foreground' />
            <h2 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
              Wallet Request Link
            </h2>
          </div>
          <p className='text-xs text-muted-foreground'>
            Share this link with the holder if they haven't responded yet.
          </p>
          <div className='flex gap-2'>
            <div className='flex-1 overflow-hidden rounded-lg border border-border bg-muted px-3 py-2 text-xs font-mono break-all'>
              {session.walletRequestUrl}
            </div>
            <Button variant='outline' size='icon' onClick={handleCopy} title='Copy link'>
              {copied ? (
                <Check className='h-4 w-4 text-emerald-500' />
              ) : (
                <Copy className='h-4 w-4' />
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Session metadata */}
      <Card className='p-6 space-y-4'>
        <h2 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
          Session Info
        </h2>
        <dl className='grid gap-3'>
          <MetaRow
            icon={Hash}
            label='Session ID'
            value={<span className='font-mono text-xs break-all'>{session.id}</span>}
          />
          <MetaRow
            icon={FileText}
            label='Requested type'
            value={<span className='font-mono'>{session.requestedType}</span>}
          />
          {session.requestedFields?.length > 0 && (
            <MetaRow
              icon={FileText}
              label='Requested fields'
              value={
                <div className='flex flex-wrap gap-1'>
                  {session.requestedFields.map(f => (
                    <span
                      key={f}
                      className='rounded-full border border-accent/30 bg-accent/5 px-2 py-0.5 text-xs font-medium text-accent'
                    >
                      {f}
                    </span>
                  ))}
                </div>
              }
            />
          )}
          {session.purpose && <MetaRow icon={FileText} label='Purpose' value={session.purpose} />}
          <MetaRow icon={Calendar} label='Created' value={formatDate(session.createdAt)} />
          <MetaRow
            icon={Hash}
            label='Nonce'
            value={<span className='font-mono text-xs break-all'>{session.nonce}</span>}
          />
        </dl>
      </Card>

      {/* Holder DID */}
      {session.holderDid && (
        <Card className='p-6 space-y-4'>
          <h2 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
            Holder
          </h2>
          <div className='flex items-start gap-3'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent'>
              <Building2 className='h-4 w-4' />
            </div>
            <div className='min-w-0'>
              <div className='text-xs text-muted-foreground'>DID</div>
              <div className='font-mono text-xs break-all mt-0.5'>{session.holderDid}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Presented data */}
      {session.status === 'VERIFIED' && session.presentedData && (
        <Card className='p-6 space-y-4'>
          <h2 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
            Presented Credential Data
          </h2>
          <div className='space-y-2'>
            {Object.entries(session.presentedData).map(([key, value]) => (
              <div key={key} className='grid grid-cols-[160px_1fr] gap-3 text-sm'>
                <dt className='text-muted-foreground font-medium capitalize'>
                  {key.replace(/_/g, ' ')}
                </dt>
                <dd className='break-all'>
                  {typeof value === 'object' ? (
                    <pre className='text-xs font-mono bg-muted rounded p-2 overflow-x-auto'>
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  ) : (
                    String(value)
                  )}
                </dd>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Rejected */}
      {session.status === 'REJECTED' && (
        <Card className='border-destructive/30 bg-destructive/5 p-5'>
          <div className='flex items-start gap-3'>
            <ShieldX className='mt-0.5 h-4 w-4 shrink-0 text-destructive' />
            <div className='text-sm text-destructive'>
              <p className='font-medium'>Verification failed</p>
              <p className='mt-1 text-destructive/80'>
                The credential presented by the holder did not pass cryptographic verification. It
                may have been tampered with, expired, or issued by an untrusted issuer.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className='flex items-start gap-3'>
      <Icon className='mt-0.5 h-4 w-4 shrink-0 text-muted-foreground' />
      <div className='min-w-0 flex-1 grid grid-cols-[140px_1fr] gap-2 text-sm'>
        <dt className='text-muted-foreground'>{label}</dt>
        <dd>{value}</dd>
      </div>
    </div>
  );
}

function BackButton() {
  const router = useRouter();
  return (
    <Button variant='ghost' size='sm' onClick={() => router.push('/verifier/sessions')}>
      <ArrowLeft className='h-4 w-4' />
      All Sessions
    </Button>
  );
}

function DetailSkeleton() {
  return (
    <div className='space-y-6'>
      <Skeleton className='h-9 w-32' />
      <Skeleton className='h-28' />
      <Skeleton className='h-44' />
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
