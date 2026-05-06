'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, ShieldOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import api from '@/lib/api';

type VCStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'DELETED';

interface IssuedVC {
  id: string;
  type: string[];
  subjectDid: string;
  status: VCStatus;
  issuedAt: string;
  expiresAt: string | null;
  payload: Record<string, unknown>;
  organization: { name: string; lei: string } | null;
  user: { email: string };
}

const STATUS_VARIANT: Record<VCStatus, 'success' | 'destructive' | 'warning' | 'secondary'> = {
  ACTIVE: 'success',
  REVOKED: 'destructive',
  EXPIRED: 'warning',
  DELETED: 'secondary',
};

export default function IssuerCredentialsPage() {
  const [credentials, setCredentials] = useState<IssuedVC[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState<IssuedVC | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState('');

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      const res = await api.get<IssuedVC[]>('/issuer/credentials');
      setCredentials(res.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    setRevokeError('');
    try {
      await api.patch(`/issuer/vc/${revokeTarget.id}/revoke`);
      setCredentials(prev =>
        prev.map(vc => (vc.id === revokeTarget.id ? { ...vc, status: 'REVOKED' as VCStatus } : vc)),
      );
      setRevokeTarget(null);
    } catch (err: unknown) {
      setRevokeError(extractErrorMessage(err, 'Failed to revoke credential'));
    } finally {
      setRevoking(false);
    }
  };

  if (loading) return <CredentialsSkeleton />;

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Issued Credentials</h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          All verifiable credentials issued by your organization.
        </p>
      </div>

      {credentials.length === 0 ? (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center'>
          <div className='mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground'>
            <BadgeCheck className='h-6 w-6' />
          </div>
          <h3 className='font-semibold'>No issued credentials yet</h3>
          <p className='mt-1.5 max-w-sm text-sm text-muted-foreground'>
            Credentials will appear here after you approve Holder requests.
          </p>
        </div>
      ) : (
        <div className='space-y-3'>
          {credentials.map(vc => {
            const displayType = vc.type.length > 1 ? vc.type[1] : vc.type[0];
            const holderName = vc.organization?.name ?? vc.user.email;

            return (
              <Card
                key={vc.id}
                className='flex items-center justify-between gap-4 p-5 transition-colors hover:border-accent/40'
              >
                <Link
                  href={`/issuer/credentials/${vc.id}`}
                  className='flex flex-1 items-start gap-3 min-w-0'
                >
                  <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent'>
                    <BadgeCheck className='h-5 w-5' />
                  </div>
                  <div className='min-w-0'>
                    <div className='font-medium'>{displayType}</div>
                    <div className='mt-0.5 text-sm text-muted-foreground truncate'>
                      {holderName}
                      {vc.organization && (
                        <span className='ml-2 font-mono text-xs'>LEI {vc.organization.lei}</span>
                      )}
                    </div>
                    <div className='mt-1 flex items-center gap-2'>
                      <Badge variant={STATUS_VARIANT[vc.status]}>{vc.status}</Badge>
                      <span className='text-xs text-muted-foreground'>
                        {new Date(vc.issuedAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </Link>
                {vc.status === 'ACTIVE' && (
                  <Button
                    variant='outline'
                    size='sm'
                    className='shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10'
                    onClick={() => setRevokeTarget(vc)}
                  >
                    <ShieldOff className='h-4 w-4' />
                    Revoke
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Revoke confirm dialog */}
      <Dialog open={Boolean(revokeTarget)} onOpenChange={() => setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke this credential?</DialogTitle>
            <DialogDescription asChild>
              <div className='space-y-2 text-sm'>
                {revokeTarget && (
                  <div className='rounded-lg bg-muted p-3'>
                    <div className='font-medium'>
                      {revokeTarget.type.length > 1 ? revokeTarget.type[1] : revokeTarget.type[0]}
                    </div>
                    <div className='mt-1 text-xs text-muted-foreground'>
                      Holder: {revokeTarget.organization?.name ?? revokeTarget.user.email}
                    </div>
                  </div>
                )}
                <p className='text-muted-foreground'>
                  The credential will be marked as <strong>REVOKED</strong> and the Holder will
                  receive a notification. This action cannot be undone.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          {revokeError && (
            <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
              {revokeError}
            </div>
          )}
          <DialogFooter>
            <Button variant='outline' onClick={() => setRevokeTarget(null)} disabled={revoking}>
              Cancel
            </Button>
            <Button
              className='bg-red-600 text-white hover:bg-red-700'
              onClick={handleRevoke}
              disabled={revoking}
            >
              {revoking ? 'Revoking...' : 'Revoke credential'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CredentialsSkeleton() {
  return (
    <div className='space-y-6'>
      <div>
        <Skeleton className='h-7 w-48' />
        <Skeleton className='mt-2 h-4 w-72' />
      </div>
      <div className='space-y-3'>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className='h-20' />
        ))}
      </div>
    </div>
  );
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message[0] ?? fallback;
    if (typeof message === 'string') return message;
  }
  return fallback;
}
