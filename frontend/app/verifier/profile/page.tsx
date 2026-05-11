'use client';

import { useEffect, useState } from 'react';
import { Building2, Key, ShieldCheck, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';

interface Organization {
  id: string;
  name: string;
  lei: string;
  country: string;
}

interface DidDocument {
  id: string;
  did: string;
  method: string;
  keyId: string;
  createdAt: string;
}

export default function VerifierProfilePage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [did, setDid] = useState<DidDocument | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [didLoading, setDidLoading] = useState(true);

  useEffect(() => {
    api
      .get<Organization>('/organization/my')
      .then(res => setOrg(res.data))
      .catch(() => {})
      .finally(() => setOrgLoading(false));

    api
      .get<DidDocument[]>('/did/my-dids')
      .then(res => setDid(res.data[0] ?? null))
      .catch(() => {})
      .finally(() => setDidLoading(false));
  }, []);

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Profile & DID</h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          Your organization details and decentralized identifier.
        </p>
      </div>

      {/* Organization */}
      <Card className='p-6 space-y-4'>
        <div className='flex items-center gap-3'>
          <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent'>
            <Building2 className='h-4 w-4' />
          </div>
          <h2 className='font-semibold'>Organization</h2>
        </div>

        {orgLoading ? (
          <div className='space-y-2'>
            <Skeleton className='h-4 w-48' />
            <Skeleton className='h-4 w-32' />
            <Skeleton className='h-4 w-64' />
          </div>
        ) : org ? (
          <dl className='grid gap-3'>
            <Row label='Legal name' value={org.name} />
            <Row label='LEI' value={<span className='font-mono'>{org.lei}</span>} />
          </dl>
        ) : (
          <div className='flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800'>
            <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' />
            No organization profile found. Please contact your administrator.
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className='grid grid-cols-[150px_1fr] gap-3 text-sm'>
      <dt className='text-muted-foreground'>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
