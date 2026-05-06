'use client';

import { useEffect, useState } from 'react';
import { Building2, ShieldCheck, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type { Organization, DidDocument } from '@/lib/vc-types';

export default function IssuerProfilePage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [dids, setDids] = useState<DidDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // DID setup dialog
  const [didDialogOpen, setDidDialogOpen] = useState(false);
  const [didPin, setDidPin] = useState('');
  const [didDomain, setDidDomain] = useState('');
  const [didLoading, setDidLoading] = useState(false);
  const [didError, setDidError] = useState('');
  const [didSuccess, setDidSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [orgRes, didsRes] = await Promise.allSettled([
          api.get<Organization>('/organization/my'),
          api.get<DidDocument[]>('/did/my-dids'),
        ]);
        if (cancelled) return;

        if (orgRes.status === 'fulfilled') setOrg(orgRes.value.data);
        if (didsRes.status === 'fulfilled') setDids(didsRes.value.data);
      } catch {
        if (!cancelled) setError('Could not load profile data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSetupDid = async (e: React.FormEvent) => {
    e.preventDefault();
    setDidLoading(true);
    setDidError('');
    setDidSuccess('');

    try {
      const res = await api.post<DidDocument>('/organization/setup-did', {
        pin: didPin,
        domain: didDomain,
      });
      setDids(prev => [res.data, ...prev]);
      setDidSuccess(`DID created: ${res.data.did}`);
      setDidDialogOpen(false);
      setDidPin('');
      setDidDomain('');
    } catch (err: unknown) {
      setDidError(extractErrorMessage(err, 'Could not create DID. Check your PIN and domain.'));
    } finally {
      setDidLoading(false);
    }
  };

  if (loading) return <ProfileSkeleton />;

  const activeDids = dids.filter(d => !d.deactivatedAt);
  const hasActiveDid = activeDids.length > 0;

  return (
    <div className='space-y-6'>
      <Button variant='ghost' size='sm' asChild className='-ml-2'>
        <Link href='/issuer/requests'>
          <ArrowLeft className='h-4 w-4' />
          Back to requests
        </Link>
      </Button>

      <div className='flex items-start gap-3'>
        <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent'>
          <Building2 className='h-6 w-6' />
        </div>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Issuer Profile</h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            Your organization details and decentralized identifier.
          </p>
        </div>
      </div>

      {error && (
        <Card className='border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive'>
          {error}
        </Card>
      )}

      {/* Organization info — read only */}
      {org && (
        <Card className='p-6'>
          <h2 className='mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
            Organization
          </h2>
          <dl className='grid gap-4 sm:grid-cols-2'>
            <div>
              <dt className='text-xs text-muted-foreground'>Name</dt>
              <dd className='mt-1 text-lg font-semibold'>{org.name}</dd>
            </div>
            <div>
              <dt className='text-xs text-muted-foreground'>LEI</dt>
              <dd className='mt-1 font-mono text-sm'>{org.lei}</dd>
            </div>
            <div>
              <dt className='text-xs text-muted-foreground'>Country</dt>
              <dd className='mt-1 text-sm'>{org.country}</dd>
            </div>
          </dl>
          <p className='mt-4 text-xs text-muted-foreground'>
            Organization details are set by the administrator and cannot be changed here.
          </p>
        </Card>
      )}

      {/* DID Section */}
      <Card className='p-6'>
        <div className='mb-4 flex items-start justify-between gap-3'>
          <div>
            <h2 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
              Decentralized Identifier (DID)
            </h2>
            <p className='mt-1 text-xs text-muted-foreground'>
              Required to sign and issue verifiable credentials.
            </p>
          </div>
          <Button onClick={() => setDidDialogOpen(true)}>
            <Sparkles className='h-4 w-4' />
            {hasActiveDid ? 'Add another DID' : 'Create DID'}
          </Button>
        </div>

        {/* Warning if there is no active DID */}
        {!hasActiveDid && (
          <div className='mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200'>
            <p className='font-medium'>DID not set up yet</p>
            <p className='mt-1 text-xs'>
              You need a DID to approve credential requests. Create one using your PIN — it will be
              used to cryptographically sign all issued credentials.
            </p>
          </div>
        )}

        {didSuccess && (
          <div className='mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700'>
            {didSuccess}
          </div>
        )}

        {activeDids.length === 0 ? (
          <div className='rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground'>
            No active DIDs. Create one to start issuing credentials.
          </div>
        ) : (
          <div className='space-y-3'>
            {activeDids.map(did => (
              <div
                key={did.id}
                className='flex items-start justify-between gap-3 rounded-lg border border-border p-4'
              >
                <div className='min-w-0'>
                  <div className='flex items-center gap-2'>
                    <ShieldCheck className='h-4 w-4 shrink-0 text-emerald-600' />
                    <span className='break-all font-mono text-sm'>{did.did}</span>
                  </div>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    Method: <span className='font-mono'>{did.method}</span> · Created{' '}
                    {new Date(did.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <Badge variant='success' className='shrink-0'>
                  Active
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* DID setup dialog */}
      <Dialog open={didDialogOpen} onOpenChange={setDidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create DID for your organization</DialogTitle>
            <DialogDescription>
              A key pair will be generated and anchored to a domain you control. Your PIN is used to
              encrypt the private key — keep it safe.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSetupDid} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='did-domain'>Domain</Label>
              <Input
                id='did-domain'
                value={didDomain}
                onChange={e => setDidDomain(e.target.value)}
                placeholder='example.com'
                required
              />
              <p className='text-xs text-muted-foreground'>
                The DID will be <span className='font-mono'>did:web:{didDomain || '...'}</span>
              </p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='did-pin'>Your wallet PIN</Label>
              <Input
                id='did-pin'
                type='password'
                inputMode='numeric'
                maxLength={4}
                value={didPin}
                onChange={e => setDidPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder='••••'
                required
              />
            </div>

            {didError && (
              <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
                {didError}
              </div>
            )}

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setDidDialogOpen(false)}
                disabled={didLoading}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={didLoading || didPin.length !== 4 || !didDomain}>
                {didLoading ? 'Creating...' : 'Create DID'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className='space-y-6'>
      <Skeleton className='h-8 w-32' />
      <div className='flex items-start gap-3'>
        <Skeleton className='h-12 w-12 rounded-xl' />
        <div className='space-y-2'>
          <Skeleton className='h-7 w-48' />
          <Skeleton className='h-4 w-64' />
        </div>
      </div>
      <Skeleton className='h-48' />
      <Skeleton className='h-64' />
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
