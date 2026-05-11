'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileBadge, Plus, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CredentialCard } from '@/components/wallet/credential-card';
import { EmptyState } from '@/components/wallet/empty-state';
import api from '@/lib/api';
import type { Organization, VerifiableCredential } from '@/lib/vc-types';

export default function CredentialsListPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [credentials, setCredentials] = useState<VerifiableCredential[]>([]);
  const [orgLoading, setOrgLoading] = useState(true);
  const [vcLoading, setVcLoading] = useState(false);
  const [orgError, setOrgError] = useState<'none' | 'not-found' | 'other'>('none');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<Organization>('/organization/my');
        if (!cancelled) setOrg(res.data);
      } catch (err: unknown) {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } }).response?.status;
        setOrgError(status === 404 ? 'not-found' : 'other');
      } finally {
        if (!cancelled) setOrgLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (orgLoading) return;
    let cancelled = false;
    setVcLoading(true);
    (async () => {
      try {
        // Якщо організація є — беремо по orgId
        // Якщо немає — беремо по userId (для LEI Credential виданого до організації)
        const url = org ? `/vc/org/${org.id}` : '/vc/my';
        const res = await api.get<VerifiableCredential[]>(url);
        if (!cancelled) setCredentials(res.data);
      } catch {
      } finally {
        if (!cancelled) setVcLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [org, orgLoading]);

  if (orgLoading) return <ListSkeleton />;

  if (orgError === 'other') {
    return (
      <div className='space-y-6'>
        <PageHeader />
        <Card className='border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive'>
          Could not load credentials. Please refresh the page.
        </Card>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <PageHeader />
      </div>

      {orgError === 'not-found' && (
        <Card className='flex items-start gap-4 border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30'>
          <AlertCircle className='mt-0.5 h-5 w-5 shrink-0 text-amber-600' />
          <div className='space-y-1'>
            <p className='font-medium text-amber-900 dark:text-amber-200'>
              Organization not set up yet
            </p>
            <p className='text-sm text-amber-800 dark:text-amber-300'>
              Most credentials require a registered organization. However, you can request a{' '}
              <span className='font-medium'>LEI Credential</span> first — once approved, it will
              allow you to register your organization automatically.
            </p>
          </div>
        </Card>
      )}

      {vcLoading ? (
        <div className='grid gap-4 sm:grid-cols-2'>
          <Skeleton className='h-44' />
          <Skeleton className='h-44' />
        </div>
      ) : credentials.length === 0 ? (
        <EmptyState
          icon={<FileBadge className='h-6 w-6' />}
          title={orgError === 'not-found' ? 'Request your LEI Credential' : 'No credentials yet'}
          description={
            orgError === 'not-found'
              ? 'A LEI Credential is the first step. Request it from a trusted issuer to verify your legal entity identity.'
              : 'Request your first verifiable credential from a trusted issuer.'
          }
          action={{
            label: orgError === 'not-found' ? 'Request LEI Credential' : 'Add document',
            href: '/wallet/credentials/request',
          }}
        />
      ) : (
        <>
          <div className='grid gap-4 sm:grid-cols-2'>
            {credentials.map(c => (
              <CredentialCard key={c.id} credential={c} />
            ))}
          </div>

          <div className='flex justify-center pt-2'>
            <Button variant='outline' size='lg' asChild>
              <Link href='/wallet/credentials/request'>
                <Plus className='h-4 w-4' />
                Add another document
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <h1 className='text-2xl font-semibold tracking-tight'>Credentials</h1>
      <p className='mt-1 text-sm text-muted-foreground'>
        Verifiable credentials issued to your organization.
      </p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className='space-y-6'>
      <div>
        <Skeleton className='h-7 w-32' />
        <Skeleton className='mt-2 h-4 w-72' />
      </div>
      <div className='grid gap-4 sm:grid-cols-2'>
        <Skeleton className='h-44' />
        <Skeleton className='h-44' />
      </div>
    </div>
  );
}
