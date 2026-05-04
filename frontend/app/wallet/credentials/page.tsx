'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileBadge, Plus, Building2 } from 'lucide-react';
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
    if (!org) return;
    let cancelled = false;
    setVcLoading(true);
    (async () => {
      try {
        const res = await api.get<VerifiableCredential[]>(`/vc/org/${org.id}`);
        if (!cancelled) setCredentials(res.data);
      } catch {
      } finally {
        if (!cancelled) setVcLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [org]);

  if (orgLoading) return <ListSkeleton />;

  if (orgError === 'not-found') {
    return (
      <div className='space-y-6'>
        <PageHeader />
        <EmptyState
          icon={<Building2 className='h-6 w-6' />}
          title='Set up your organization first'
          description='Credentials are issued to organizations. Create your legal entity profile before requesting documents.'
          action={{ label: 'Create organization', href: '/wallet/organization' }}
        />
      </div>
    );
  }

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
        {credentials.length > 0 && (
          <Button asChild>
            <Link href='/wallet/credentials/request'>
              <Plus className='h-4 w-4' />
              Add document
            </Link>
          </Button>
        )}
      </div>

      {vcLoading ? (
        <div className='grid gap-4 sm:grid-cols-2'>
          <Skeleton className='h-44' />
          <Skeleton className='h-44' />
        </div>
      ) : credentials.length === 0 ? (
        <EmptyState
          icon={<FileBadge className='h-6 w-6' />}
          title='No credentials yet'
          description='Request your first verifiable credential from a trusted issuer.'
          action={{ label: 'Add document', href: '/wallet/credentials/request' }}
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
