'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, FileBadge, ArrowRight, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/wallet/empty-state';
import api from '@/lib/api';
import { getCurrentUser, type CurrentUser } from '@/lib/auth';
import type { Organization } from '@/lib/vc-types';

export default function WalletDashboardPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgError, setOrgError] = useState<'none' | 'not-found' | 'other'>('none');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [userRes, orgRes] = await Promise.allSettled([
          getCurrentUser(),
          api.get<Organization>('/organization/my'),
        ]);

        if (cancelled) return;

        if (userRes.status === 'fulfilled') {
          setUser(userRes.value);
        }

        if (orgRes.status === 'fulfilled') {
          setOrg(orgRes.value.data);
        } else {
          const status = (orgRes.reason as { response?: { status?: number } })?.response?.status;
          setOrgError(status === 404 ? 'not-found' : 'other');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <DashboardSkeleton />;

  if (orgError === 'not-found') {
    return (
      <div className='space-y-6'>
        <PageHeader
          title='Welcome to your EUDI Wallet'
          description='Set up your organization profile to start managing verifiable credentials.'
        />
        <EmptyState
          icon={<Building2 className='h-6 w-6' />}
          title='No organization yet'
          description='Before you can request or store credentials, register your legal entity (LEI, name, country) in the wallet.'
          action={{ label: 'Create organization', href: '/wallet/organization' }}
        />
      </div>
    );
  }

  if (orgError === 'other') {
    return (
      <div className='space-y-6'>
        <PageHeader title='Dashboard' description='Something went wrong loading your profile.' />
        <Card className='border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive'>
          Could not load organization data. Please refresh the page or sign in again.
        </Card>
      </div>
    );
  }

  return (
    <div className='space-y-8'>
      <PageHeader
        title={`Welcome back${org ? `, ${org.name}` : ''}`}
        description='An overview of your organization and quick access to credentials.'
      />

      {/* Organization card */}
      <Card className='p-6'>
        <div className='mb-4 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground'>
          <Building2 className='h-3.5 w-3.5' />
          Organization
        </div>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
          <div className='space-y-3'>
            <div>
              <div className='text-xs text-muted-foreground'>Name</div>
              <div className='text-lg font-semibold'>{org?.name ?? '—'}</div>
            </div>
            <div className='grid grid-cols-2 gap-6'>
              <div>
                <div className='text-xs text-muted-foreground'>LEI</div>
                <div className='font-mono text-sm'>{org?.lei ?? '—'}</div>
              </div>
              <div>
                <div className='text-xs text-muted-foreground'>Country</div>
                <div className='text-sm'>{org?.country ?? '—'}</div>
              </div>
            </div>
            {user && (
              <div>
                <div className='text-xs text-muted-foreground'>Account</div>
                <div className='text-sm'>{user.email}</div>
              </div>
            )}
          </div>
          <Button variant='outline' asChild>
            <Link href='/wallet/organization'>Edit</Link>
          </Button>
        </div>
      </Card>

      {/* Credentials */}
      <Card className='flex flex-col gap-4 border-accent/20 bg-accent/5 p-6 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-start gap-3'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent'>
            <FileBadge className='h-5 w-5' />
          </div>
          <div>
            <h3 className='font-semibold'>Verifiable Credentials</h3>
            <p className='mt-0.5 text-sm text-muted-foreground'>
              View, manage, and request credentials issued to your organization.
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href='/wallet/credentials'>
            Open credentials
            <ArrowRight className='h-4 w-4' />
          </Link>
        </Button>
      </Card>

      {/* Hint about Add document */}
      <Card className='p-6'>
        <div className='flex items-start gap-3'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground'>
            <Sparkles className='h-5 w-5' />
          </div>
          <div>
            <h3 className='font-semibold'>Need a new credential?</h3>
            <p className='mt-0.5 text-sm text-muted-foreground'>
              Choose a trusted issuer and request a credential type they offer (e.g.{' '}
              <span className='font-medium text-foreground'>Legal Entity Identifier</span> or{' '}
              <span className='font-medium text-foreground'>Power of Attorney</span>).
            </p>
            <Button variant='link' className='mt-2 h-auto p-0' asChild>
              <Link href='/wallet/credentials/request'>
                Request a credential
                <ArrowRight className='h-3 w-3' />
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className='text-2xl font-semibold tracking-tight'>{title}</h1>
      <p className='mt-1 text-sm text-muted-foreground'>{description}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className='space-y-8'>
      <div>
        <Skeleton className='h-7 w-64' />
        <Skeleton className='mt-2 h-4 w-96' />
      </div>
      <Skeleton className='h-48' />
      <Skeleton className='h-24' />
      <Skeleton className='h-32' />
    </div>
  );
}
