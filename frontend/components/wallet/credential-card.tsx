'use client';

import Link from 'next/link';
import { FileBadge, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { VerifiableCredential, VerifiableCredentialStatus } from '@/lib/vc-types';

interface CredentialCardProps {
  credential: VerifiableCredential;
}

const STATUS_VARIANT: Record<
  VerifiableCredentialStatus,
  'success' | 'destructive' | 'warning' | 'secondary'
> = {
  ACTIVE: 'success',
  REVOKED: 'destructive',
  EXPIRED: 'warning',
  DELETED: 'secondary',
};

export function CredentialCard({ credential }: CredentialCardProps) {
  const displayType =
    credential.type.length > 1 ? credential.type[1] : (credential.type[0] ?? 'Credential');

  const subject = extractSubjectName(credential.payload);

  return (
    <Link href={`/wallet/credentials/${credential.id}`} className='group block focus:outline-none'>
      <Card className='relative overflow-hidden border-border p-5 transition-all hover:border-accent/40 hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring'>
        <div className='flex items-start justify-between gap-4'>
          <div className='flex items-start gap-3 min-w-0'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent'>
              <FileBadge className='h-5 w-5' />
            </div>
            <div className='min-w-0 flex-1'>
              <h3 className='font-semibold leading-snug truncate'>{displayType}</h3>
              {subject && (
                <p className='mt-0.5 text-sm text-muted-foreground truncate'>{subject}</p>
              )}
            </div>
          </div>
          <Badge variant={STATUS_VARIANT[credential.status]} className='shrink-0'>
            {credential.status}
          </Badge>
        </div>

        <dl className='mt-4 grid grid-cols-2 gap-3 text-xs'>
          <div>
            <dt className='text-muted-foreground'>Issued</dt>
            <dd className='mt-0.5 font-medium'>{formatDate(credential.issuedAt)}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground'>Expires</dt>
            <dd className='mt-0.5 font-medium'>
              {credential.expiresAt ? formatDate(credential.expiresAt) : '—'}
            </dd>
          </div>
        </dl>

        <div className='mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground'>
          <span className='font-mono truncate max-w-[70%]'>{shortDid(credential.issuerDid)}</span>
          <ChevronRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' />
        </div>
      </Card>
    </Link>
  );
}

function extractSubjectName(payload: Record<string, unknown>): string | null {
  const candidates = ['companyName', 'name', 'legalName', 'grantorName'];

  const subject = payload.credentialSubject;
  if (typeof subject === 'object' && subject !== null) {
    for (const key of candidates) {
      const value = (subject as Record<string, unknown>)[key];
      if (typeof value === 'string') return value;
    }
  }

  for (const key of candidates) {
    const value = payload[key];
    if (typeof value === 'string') return value;
  }
  return null;
}

function shortDid(did: string): string {
  if (did.length <= 32) return did;
  return `${did.slice(0, 16)}…${did.slice(-12)}`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
