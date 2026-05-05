'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, Save, Sparkles, ShieldCheck } from 'lucide-react';
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
import type { DidDocument, Organization } from '@/lib/vc-types';

export default function OrganizationPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [dids, setDids] = useState<DidDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  // Форма (працює і для create, і для update)
  const [lei, setLei] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');

  // DID setup
  const [didDialogOpen, setDidDialogOpen] = useState(false);
  const [didPin, setDidPin] = useState('');
  const [didDomain, setDidDomain] = useState('');
  const [didLoading, setDidLoading] = useState(false);
  const [didError, setDidError] = useState('');

  // Завантаження поточної організації + DID
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [orgRes, didsRes] = await Promise.allSettled([
          api.get<Organization>('/organization/my'),
          api.get<DidDocument[]>('/did/my-dids'),
        ]);

        if (cancelled) return;

        if (orgRes.status === 'fulfilled') {
          setOrg(orgRes.value.data);
          setLei(orgRes.value.data.lei);
          setName(orgRes.value.data.name);
          setCountry(orgRes.value.data.country);
        }

        if (didsRes.status === 'fulfilled') {
          setDids(didsRes.value.data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isExisting = Boolean(org);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (isExisting) {
        // Бекенд забороняє змінювати LEI; шлемо тільки name + country.
        const res = await api.patch<Organization>('/organization/my', { name, country });
        setOrg(res.data);
        setSuccess('Organization updated.');
      } else {
        const res = await api.post<Organization>('/organization/create', {
          lei,
          name,
          country,
        });
        setOrg(res.data);
        setSuccess('Organization created. You can now set up a DID.');
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Could not save organization'));
    } finally {
      setSaving(false);
    }
  };

  const handleSetupDid = async (e: React.FormEvent) => {
    e.preventDefault();
    setDidLoading(true);
    setDidError('');

    try {
      const res = await api.post<DidDocument>('/organization/setup-did', {
        pin: didPin,
        domain: didDomain,
      });
      setDids(prev => [res.data, ...prev]);
      setDidDialogOpen(false);
      setDidPin('');
      setDidDomain('');
      setSuccess('DID created successfully.');
    } catch (err: unknown) {
      setDidError(extractErrorMessage(err, 'Could not create DID. Check your PIN and domain.'));
    } finally {
      setDidLoading(false);
    }
  };

  if (loading) return <OrgSkeleton />;

  const activeDids = dids.filter(d => !d.deactivatedAt);

  return (
    <div className='space-y-6'>
      <Button variant='ghost' size='sm' asChild className='-ml-2'>
        <Link href='/wallet'>
          <ArrowLeft className='h-4 w-4' />
          Back to dashboard
        </Link>
      </Button>

      <div className='flex items-start gap-3'>
        <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent'>
          <Building2 className='h-6 w-6' />
        </div>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Organization</h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            {isExisting
              ? 'Manage your legal entity profile and decentralized identifier.'
              : 'Register your legal entity to start using the wallet.'}
          </p>
        </div>
      </div>

      {/* Profile form */}
      <Card className='p-6'>
        <h2 className='mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
          Legal entity profile
        </h2>
        <form onSubmit={handleSave} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='lei'>
              LEI Code <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='lei'
              value={lei}
              onChange={e => setLei(e.target.value)}
              placeholder='20-character Legal Entity Identifier'
              minLength={20}
              maxLength={20}
              required
              disabled={isExisting}
            />
            <p className='text-xs text-muted-foreground'>
              {isExisting
                ? 'LEI cannot be changed once set. Contact support if needed.'
                : '20-character identifier issued under ISO 17442.'}
            </p>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='name'>
                Organization name <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='name'
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder='Acme Holdings Ltd.'
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='country'>
                Country <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='country'
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder='Ukraine'
                required
              />
            </div>
          </div>

          {error && (
            <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{error}</div>
          )}
          {success && (
            <div className='rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400'>
              {success}
            </div>
          )}

          <div className='flex justify-end'>
            <Button type='submit' disabled={saving}>
              <Save className='h-4 w-4' />
              {saving ? 'Saving...' : isExisting ? 'Save changes' : 'Create organization'}
            </Button>
          </div>
        </form>
      </Card>

      {/* DID Section */}
      {isExisting && (
        <Card className='p-6'>
          <div className='mb-4 flex items-start justify-between gap-3'>
            <div>
              <h2 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
                Decentralized Identifier (DID)
              </h2>
              <p className='mt-1 text-xs text-muted-foreground'>
                A cryptographic identity for your organization, anchored to a domain you control.
              </p>
            </div>
            <Button onClick={() => setDidDialogOpen(true)}>
              <Sparkles className='h-4 w-4' />
              {activeDids.length === 0 ? 'Create DID' : 'Add another DID'}
            </Button>
          </div>

          {activeDids.length === 0 ? (
            <div className='rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground'>
              No DID created yet. Set one up to enable credential issuance and verification.
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
                      {new Date(did.createdAt).toLocaleDateString('en-GB')}
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
      )}

      {/* DID setup dialog */}
      <Dialog open={didDialogOpen} onOpenChange={setDidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create DID for your organization</DialogTitle>
            <DialogDescription>
              We&apos;ll generate a key pair and anchor it to a domain you control. You&apos;ll need
              your wallet PIN to encrypt the private key.
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
                The DID will be <span className='font-mono'>did:web:{didDomain || '...'}</span>.
              </p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='did-pin'>Wallet PIN</Label>
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

function OrgSkeleton() {
  return (
    <div className='space-y-6'>
      <Skeleton className='h-8 w-32' />
      <div className='flex items-start gap-3'>
        <Skeleton className='h-12 w-12 rounded-xl' />
        <div className='space-y-2'>
          <Skeleton className='h-7 w-48' />
          <Skeleton className='h-4 w-72' />
        </div>
      </div>
      <Skeleton className='h-72' />
      <Skeleton className='h-48' />
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
