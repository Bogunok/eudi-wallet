'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Save,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  FileBadge,
} from 'lucide-react';
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

interface LeiCredential {
  id: string;
  type: string[];
  payload: { lei?: string; legalName?: string; country?: string };
  status: string;
}

export default function OrganizationPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [dids, setDids] = useState<DidDocument[]>([]);
  const [leiCredential, setLeiCredential] = useState<LeiCredential | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const [lei, setLei] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');

  const [didDialogOpen, setDidDialogOpen] = useState(false);
  const [didPin, setDidPin] = useState('');
  const [didDomain, setDidDomain] = useState('');
  const [didLoading, setDidLoading] = useState(false);
  const [didError, setDidError] = useState('');

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
          const o = orgRes.value.data;
          setOrg(o);
          setLei(o.lei);
          setName(o.name);
          setCountry(o.country);
        } else {
          // Організації немає — шукаємо LEI Credential щоб підставити дані
          try {
            const credRes = await api.get<LeiCredential[]>('/vc/my');
            const leiCred = credRes.data.find(
              c => c.status === 'ACTIVE' && c.type.some(t => t.toLowerCase().includes('lei')),
            );
            if (leiCred) {
              setLeiCredential(leiCred);
              setLei(leiCred.payload.lei ?? '');
              setName(leiCred.payload.legalName ?? '');
              setCountry(leiCred.payload.country ?? '');
            }
          } catch {
            // немає організації і немає vc
          }
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
        const res = await api.patch<Organization>('/organization/my', { name, country });
        setOrg(res.data);
        setSuccess('Organization updated.');
      } else {
        const res = await api.post<Organization>('/organization/create', { lei, name, country });
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
  // Форма активна якщо: організація вже існує, АБО є LEI Credential
  const formEnabled = isExisting || Boolean(leiCredential);

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

      {/* Банер якщо немає ні організації ні LEI Credential */}
      {!isExisting && !leiCredential && (
        <Card className='flex items-start gap-4 border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30'>
          <AlertCircle className='mt-0.5 h-5 w-5 shrink-0 text-amber-600' />
          <div className='space-y-2'>
            <p className='font-medium text-amber-900 dark:text-amber-200'>
              Please request a LEI Credential first
            </p>
            <p className='text-sm text-amber-800 dark:text-amber-300'>
              To register your organization, you need a verified LEI Credential issued by a trusted
              issuer. Once approved, your organization details will be filled in automatically.
            </p>
            <Button size='sm' asChild className='mt-1'>
              <Link href='/wallet/credentials'>
                <FileBadge className='h-4 w-4' />
                Go to Credentials
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {/* Банер якщо є LEI Credential але організація ще не створена */}
      {!isExisting && leiCredential && (
        <Card className='flex items-start gap-4 border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950/30'>
          <ShieldCheck className='mt-0.5 h-5 w-5 shrink-0 text-emerald-600' />
          <div>
            <p className='font-medium text-emerald-900 dark:text-emerald-200'>
              LEI Credential found
            </p>
            <p className='text-sm text-emerald-800 dark:text-emerald-300'>
              Your details have been filled in from your verified credential. Review and confirm.
            </p>
          </div>
        </Card>
      )}

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
              disabled={isExisting || !formEnabled}
              readOnly={Boolean(leiCredential)}
              className={leiCredential ? 'bg-muted cursor-not-allowed' : ''}
            />
            <p className='text-xs text-muted-foreground'>
              {isExisting
                ? 'LEI cannot be changed once set. Contact support if needed.'
                : leiCredential
                  ? 'Filled automatically from your verified LEI Credential. Cannot be edited.'
                  : 'Will be filled automatically from your LEI Credential.'}
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
                placeholder='Acme Holdings Ltd.'
                required
                disabled
                className='bg-muted cursor-not-allowed'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='country'>
                Country <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='country'
                value={country}
                placeholder='Ukraine'
                required
                disabled
                className='bg-muted cursor-not-allowed'
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
            {isExisting ? (
              <p className='text-xs text-muted-foreground'>
                To update organization details, visit{' '}
                <a href='/wallet/credentials' className='underline text-accent'>
                  Credentials
                </a>{' '}
                page to request updates of LEI.
              </p>
            ) : (
              <Button type='submit' disabled={saving || !formEnabled}>
                <Save className='h-4 w-4' />
                {saving ? 'Saving...' : 'Create organization'}
              </Button>
            )}
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
