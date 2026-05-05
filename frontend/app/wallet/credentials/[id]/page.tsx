'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileBadge, Trash2, Copy, Check } from 'lucide-react';
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
import type { VerifiableCredential, VerifiableCredentialStatus } from '@/lib/vc-types';

const STATUS_VARIANT: Record<
  VerifiableCredentialStatus,
  'success' | 'destructive' | 'warning' | 'secondary'
> = {
  ACTIVE: 'success',
  REVOKED: 'destructive',
  EXPIRED: 'warning',
  DELETED: 'secondary',
};

export default function CredentialDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [credential, setCredential] = useState<VerifiableCredential | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copiedJwt, setCopiedJwt] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<VerifiableCredential>(`/vc/${id}`);
        if (!cancelled) setCredential(res.data);
      } catch (err: unknown) {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } }).response?.status;
        if (status === 404) setNotFound(true);
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
    } catch {
      // на http localhost clipboard може не працювати
    }
  };

  const handleDelete = async () => {
    if (!credential) return;
    setDeleting(true);
    try {
      await api.delete(`/vc/${credential.id}`);
      router.push('/wallet');
    } catch {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  if (loading) return <DetailSkeleton />;
  if (notFound || !credential) return <NotFoundView />;

  const displayType =
    credential.type.length > 1 ? credential.type[1] : (credential.type[0] ?? 'Credential');

  return (
    <div className='space-y-6'>
      <BackLink />

      {/* Header */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='flex items-start gap-3'>
          <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent'>
            <FileBadge className='h-6 w-6' />
          </div>
          <div>
            <h1 className='text-2xl font-semibold tracking-tight'>{displayType}</h1>
            <p className='mt-1 text-sm text-muted-foreground'>
              Verifiable Credential ·{' '}
              <span className='font-mono'>{credential.id.slice(0, 8)}…</span>
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
          <Field label='Issued at' value={formatDate(credential.issuedAt)} />
          <Field
            label='Expires at'
            value={credential.expiresAt ? formatDate(credential.expiresAt) : 'Never'}
          />
          <Field label='Status' value={credential.status} />
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
              The cryptographically signed token issued by the trusted authority.
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

      {/* Danger zone */}
      <Card className='border-destructive/20 bg-destructive/5 p-6'>
        <h2 className='text-sm font-semibold text-destructive'>Danger zone</h2>
        <p className='mt-1 text-xs text-muted-foreground'>
          Removing the credential from your wallet does not revoke it on the issuer&apos;s side. To
          revoke, contact the issuer.
        </p>
        <Button
          variant='destructive'
          size='sm'
          className='mt-4'
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className='h-4 w-4' />
          Remove from wallet
        </Button>
      </Card>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this credential?</DialogTitle>
            <DialogDescription>
              The credential will be marked as deleted in your wallet. You will not see it in your
              dashboard anymore. This action does not revoke the credential on the issuer side.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setConfirmOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -- helpers --

function BackLink() {
  return (
    <Button variant='ghost' size='sm' asChild className='-ml-2'>
      <Link href='/wallet'>
        <ArrowLeft className='h-4 w-4' />
        Back to dashboard
      </Link>
    </Button>
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
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-GB', {
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
      <Skeleton className='h-8 w-32' />
      <div className='flex items-start gap-3'>
        <Skeleton className='h-12 w-12 rounded-xl' />
        <div className='space-y-2'>
          <Skeleton className='h-7 w-48' />
          <Skeleton className='h-4 w-32' />
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
      <BackLink />
      <Card className='p-12 text-center'>
        <h2 className='text-lg font-semibold'>Credential not found</h2>
        <p className='mt-2 text-sm text-muted-foreground'>
          This credential does not exist or you do not have access to it.
        </p>
      </Card>
    </div>
  );
}
