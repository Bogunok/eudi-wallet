'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BadgeCheck, ShieldOff, Copy, Check } from 'lucide-react';
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
  issuerDid: string;
  subjectDid: string;
  payload: Record<string, unknown>;
  rawJwt: string;
  status: VCStatus;
  issuedAt: string;
  expiresAt: string | null;
  organization: { name: string; lei: string } | null;
  user: { email: string };
}

const STATUS_VARIANT: Record<VCStatus, 'success' | 'destructive' | 'warning' | 'secondary'> = {
  ACTIVE: 'success',
  REVOKED: 'destructive',
  EXPIRED: 'warning',
  DELETED: 'secondary',
};

export default function IssuerCredentialDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [credential, setCredential] = useState<IssuedVC | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copiedJwt, setCopiedJwt] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<IssuedVC[]>('/issuer/credentials');
        if (cancelled) return;
        const found = res.data.find(vc => vc.id === id);
        if (!found) {
          setNotFound(true);
          return;
        }
        setCredential(found);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleCopyJwt = async () => {
    if (!credential) return;
    try {
      await navigator.clipboard.writeText(credential.rawJwt);
      setCopiedJwt(true);
      setTimeout(() => setCopiedJwt(false), 2000);
    } catch {}
  };

  const handleRevoke = async () => {
    if (!credential) return;
    setRevoking(true);
    setRevokeError('');
    try {
      await api.patch(`/issuer/vc/${credential.id}/revoke`);
      setCredential(prev => (prev ? { ...prev, status: 'REVOKED' } : prev));
      setRevokeOpen(false);
    } catch (err: unknown) {
      setRevokeError(extractErrorMessage(err, 'Failed to revoke. Please try again.'));
    } finally {
      setRevoking(false);
    }
  };

  if (loading) return <DetailSkeleton />;
  if (notFound || !credential) return <NotFoundView />;

  const displayType = credential.type.length > 1 ? credential.type[1] : credential.type[0];
  const holderName = credential.organization?.name ?? credential.user.email;

  return (
    <div className='space-y-6'>
      <Button variant='ghost' size='sm' asChild className='-ml-2'>
        <Link href='/issuer/credentials'>
          <ArrowLeft className='h-4 w-4' />
          Back to issued credentials
        </Link>
      </Button>

      {/* Header */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='flex items-start gap-3'>
          <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent'>
            <BadgeCheck className='h-6 w-6' />
          </div>
          <div>
            <h1 className='text-2xl font-semibold tracking-tight'>{displayType}</h1>
            <p className='mt-1 text-sm text-muted-foreground'>
              Issued to <span className='font-medium text-foreground'>{holderName}</span>
              {credential.organization && (
                <span className='ml-2 font-mono text-xs'>LEI {credential.organization.lei}</span>
              )}
            </p>
          </div>
        </div>
        <Badge variant={STATUS_VARIANT[credential.status]} className='shrink-0'>
          {credential.status}
        </Badge>
      </div>

      {/* Metadata */}
      <Card className='p-6'>
        <h2 className='mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
          Metadata
        </h2>
        <dl className='grid gap-4 sm:grid-cols-2'>
          <Field label='Type' value={credential.type.join(', ')} />
          <Field label='Status' value={credential.status} />
          <Field label='Issued at' value={formatDate(credential.issuedAt)} />
          <Field
            label='Expires at'
            value={credential.expiresAt ? formatDate(credential.expiresAt) : 'Never'}
          />
          <Field label='Issuer DID' value={credential.issuerDid} mono />
          <Field label='Subject DID' value={credential.subjectDid} mono />
        </dl>
      </Card>

      {/* Payload */}
      <Card className='p-6'>
        <h2 className='mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
          Payload
        </h2>
        <pre className='overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed'>
          {JSON.stringify(credential.payload, null, 2)}
        </pre>
      </Card>

      {/* Raw JWT */}
      <Card className='p-6'>
        <div className='mb-4 flex items-start justify-between gap-3'>
          <div>
            <h2 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
              Raw JWT
            </h2>
            <p className='mt-1 text-xs text-muted-foreground'>
              The cryptographically signed token. Signed with your issuer DID private key.
            </p>
          </div>
          <Button variant='outline' size='sm' onClick={handleCopyJwt}>
            {copiedJwt ? <Check className='h-3 w-3' /> : <Copy className='h-3 w-3' />}
            {copiedJwt ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <pre className='overflow-x-auto break-all rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap'>
          {credential.rawJwt}
        </pre>
      </Card>

      {/* Revoke zone */}
      {credential.status === 'ACTIVE' && (
        <Card className='border-destructive/20 bg-destructive/5 p-6'>
          <h2 className='text-sm font-semibold text-destructive'>Revoke credential</h2>
          <p className='mt-1 text-xs text-muted-foreground'>
            Revoking marks this credential as invalid. The Holder will receive a notification and
            will no longer be able to use it for verification.
          </p>
          <Button
            variant='outline'
            size='sm'
            className='mt-4 border-destructive/40 text-destructive hover:bg-destructive/10'
            onClick={() => setRevokeOpen(true)}
          >
            <ShieldOff className='h-4 w-4' />
            Revoke this credential
          </Button>
        </Card>
      )}

      {/* Revoke dialog */}
      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke this credential?</DialogTitle>
            <DialogDescription asChild>
              <div className='space-y-2 text-sm text-muted-foreground'>
                <p>
                  This will mark <strong className='text-foreground'>{displayType}</strong> issued
                  to <strong className='text-foreground'>{holderName}</strong> as REVOKED.
                </p>
                <p>The Holder will receive a warning notification. This action cannot be undone.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          {revokeError && (
            <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
              {revokeError}
            </div>
          )}
          <DialogFooter>
            <Button variant='outline' onClick={() => setRevokeOpen(false)} disabled={revoking}>
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

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className='text-xs text-muted-foreground'>{label}</dt>
      <dd className={`mt-1 text-sm ${mono ? 'break-all font-mono' : ''}`}>{value}</dd>
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

function DetailSkeleton() {
  return (
    <div className='space-y-6'>
      <Skeleton className='h-8 w-40' />
      <div className='flex items-start gap-3'>
        <Skeleton className='h-12 w-12 rounded-xl' />
        <div className='space-y-2'>
          <Skeleton className='h-7 w-48' />
          <Skeleton className='h-4 w-64' />
        </div>
      </div>
      <Skeleton className='h-48' />
      <Skeleton className='h-48' />
      <Skeleton className='h-32' />
    </div>
  );
}

function NotFoundView() {
  return (
    <div className='space-y-6'>
      <Button variant='ghost' size='sm' asChild className='-ml-2'>
        <Link href='/issuer/credentials'>
          <ArrowLeft className='h-4 w-4' />
          Back
        </Link>
      </Button>
      <Card className='p-12 text-center'>
        <h2 className='text-lg font-semibold'>Credential not found</h2>
        <p className='mt-2 text-sm text-muted-foreground'>
          This credential does not exist or was not issued by your organization.
        </p>
      </Card>
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
