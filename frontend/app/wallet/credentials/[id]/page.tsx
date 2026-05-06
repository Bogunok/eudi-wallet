'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileBadge,
  Trash2,
  Copy,
  Check,
  ShieldOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import api from '@/lib/api';
import type {
  VerifiableCredential,
  VerifiableCredentialStatus,
  JsonSchemaStructure,
} from '@/lib/vc-types';
import { parseSchemaFields } from '@/lib/json-schema';
import { formatClaimsForDisplay } from '@/lib/sd-jwt';

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

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Request Revocation
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState('');
  const [revokeSuccess, setRevokeSuccess] = useState(false);

  // Request Update
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateSchema, setUpdateSchema] = useState<JsonSchemaStructure | null>(null);
  const [updateFields, setUpdateFields] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [schemaExpanded, setSchemaExpanded] = useState(false);

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

  // Loading schema for Update form
  useEffect(() => {
    if (!updateOpen || !credential) return;

    // Searching for schema through /schemas/available
    api
      .get<Array<{ id: string; structure: JsonSchemaStructure; issuerId: string }>>(
        '/schemas/available',
      )
      .then(res => {
        const schema = res.data.find(s => {
          return true;
        });
        if (schema) setUpdateSchema(schema.structure);
      })
      .catch(() => {});
  }, [updateOpen, credential]);

  const handleCopyJwt = async () => {
    if (!credential) return;
    try {
      await navigator.clipboard.writeText(credential.rawJwt);
      setCopiedJwt(true);
      setTimeout(() => setCopiedJwt(false), 2000);
    } catch {}
  };

  const handleDelete = async () => {
    if (!credential) return;
    setDeleting(true);
    try {
      await api.delete(`/vc/${credential.id}`);
      router.push('/wallet/credentials');
    } catch {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const handleRequestRevocation = async () => {
    if (!credential) return;
    setRevoking(true);
    setRevokeError('');
    try {
      await api.post('/wallet/request-revocation', { vcId: credential.id });
      setRevokeSuccess(true);
      setRevokeOpen(false);
    } catch (err: unknown) {
      setRevokeError(extractErrorMessage(err, 'Failed to send revocation request.'));
    } finally {
      setRevoking(false);
    }
  };

  const handleRequestUpdate = async () => {
    if (!credential) return;
    setUpdating(true);
    setUpdateError('');
    try {
      await api.post('/wallet/request-update', {
        vcId: credential.id,
        newClaimData: updateFields,
      });
      setUpdateSuccess(true);
      setUpdateOpen(false);
    } catch (err: unknown) {
      setUpdateError(extractErrorMessage(err, 'Failed to send update request.'));
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <DetailSkeleton />;
  if (notFound || !credential) return <NotFoundView />;

  const displayType =
    credential.type.length > 1 ? credential.type[1] : (credential.type[0] ?? 'Credential');
  const isActive = credential.status === 'ACTIVE';
  const formFields = updateSchema ? parseSchemaFields(updateSchema) : [];
  const decodedClaims = formatClaimsForDisplay(credential.rawJwt);

  return (
    <div className='space-y-6'>
      <Button variant='ghost' size='sm' asChild className='-ml-2'>
        <Link href='/wallet/credentials'>
          <ArrowLeft className='h-4 w-4' />
          Back to credentials
        </Link>
      </Button>

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
        <Badge variant={STATUS_VARIANT[credential.status]}>{credential.status}</Badge>
      </div>

      {/* Success banners */}
      {revokeSuccess && (
        <div className='rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800'>
          <p className='font-medium'>Revocation request sent</p>
          <p className='mt-0.5 text-xs'>
            The issuer will review your request and notify you when processed.
          </p>
        </div>
      )}
      {updateSuccess && (
        <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700'>
          <p className='font-medium'>Update request sent</p>
          <p className='mt-0.5 text-xs'>
            The issuer will review your request and issue a new credential.
          </p>
        </div>
      )}

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

      {/* Credential data — decoded SD-JWT claims */}
      <Card className='p-6'>
        <h2 className='mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
          Credential data
        </h2>
        {decodedClaims ? (
          <div className='rounded-lg border border-border bg-card p-4 space-y-3'>
            {Object.entries(decodedClaims).map(([key, value]) => (
              <div key={key} className='grid grid-cols-2 gap-4'>
                <dt className='text-sm text-muted-foreground capitalize'>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </dt>
                <dd className='text-sm font-medium break-all'>
                  {typeof value === 'string' || typeof value === 'number'
                    ? String(value)
                    : JSON.stringify(value)}
                </dd>
              </div>
            ))}
          </div>
        ) : (
          <pre className='overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed'>
            {JSON.stringify(credential.payload, null, 2)}
          </pre>
        )}
      </Card>

      {/* Raw payload (SD-JWT structure) */}
      <Card className='p-6'>
        <h2 className='mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
          Raw payload (SD-JWT)
        </h2>
        <p className='mb-3 text-xs text-muted-foreground'>
          Fields are stored as cryptographic hashes. Only disclosed fields are visible above.
        </p>
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
              Cryptographically signed token — proof of authenticity.
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

      {/* Actions for ACTIVE credentials */}
      {isActive && (
        <Card className='p-6 space-y-4'>
          <h2 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
            Credential actions
          </h2>

          {/* Request Update */}
          <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between rounded-lg border border-border p-4'>
            <div>
              <p className='font-medium text-sm'>Request update</p>
              <p className='mt-0.5 text-xs text-muted-foreground'>
                Ask the issuer to revoke this credential and issue a new one with updated data.
              </p>
            </div>
            <Button
              variant='outline'
              size='sm'
              className='shrink-0'
              onClick={() => setUpdateOpen(true)}
              disabled={updateSuccess}
            >
              <RefreshCw className='h-4 w-4' />
              {updateSuccess ? 'Requested' : 'Request update'}
            </Button>
          </div>

          {/* Request Revocation */}
          <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-4'>
            <div>
              <p className='font-medium text-sm text-destructive'>Request revocation</p>
              <p className='mt-0.5 text-xs text-muted-foreground'>
                Ask the issuer to permanently revoke this credential. This cannot be undone.
              </p>
            </div>
            <Button
              variant='outline'
              size='sm'
              className='shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10'
              onClick={() => setRevokeOpen(true)}
              disabled={revokeSuccess}
            >
              <ShieldOff className='h-4 w-4' />
              {revokeSuccess ? 'Requested' : 'Request revocation'}
            </Button>
          </div>
        </Card>
      )}

      {/* Danger zone — delete locally */}
      <Card className='border-destructive/20 bg-destructive/5 p-6'>
        <h2 className='text-sm font-semibold text-destructive'>Danger zone</h2>
        <p className='mt-1 text-xs text-muted-foreground'>
          Remove this credential from your wallet. This does not revoke it on the issuer&apos;s
          side.
        </p>
        <Button
          variant='destructive'
          size='sm'
          className='mt-4'
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className='h-4 w-4' />
          Remove from wallet
        </Button>
      </Card>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this credential?</DialogTitle>
            <DialogDescription>
              The credential will be removed from your wallet. This does not revoke it on the issuer
              side.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revocation request dialog */}
      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request revocation?</DialogTitle>
            <DialogDescription asChild>
              <div className='space-y-2 text-sm text-muted-foreground'>
                <p>
                  You are requesting the issuer to revoke{' '}
                  <strong className='text-foreground'>{displayType}</strong>.
                </p>
                <p>
                  The issuer will review your request. If approved, this credential will be
                  permanently marked as REVOKED and you will receive a notification.
                </p>
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
              onClick={handleRequestRevocation}
              disabled={revoking}
            >
              {revoking ? 'Sending...' : 'Send revocation request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update request dialog */}
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>Request credential update</DialogTitle>
            <DialogDescription>
              Provide updated information. The issuer will revoke this credential and issue a new
              one.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 max-h-96 overflow-y-auto pr-1'>
            {/* Schema data */}
            <div>
              <button
                type='button'
                onClick={() => setSchemaExpanded(v => !v)}
                className='flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors'
              >
                {schemaExpanded ? (
                  <ChevronUp className='h-3 w-3' />
                ) : (
                  <ChevronDown className='h-3 w-3' />
                )}
                View current data
              </button>
              {schemaExpanded &&
                (decodedClaims ? (
                  <div className='mt-2 rounded-lg border border-border bg-card p-3 space-y-2'>
                    {Object.entries(decodedClaims).map(([key, value]) => (
                      <div key={key} className='grid grid-cols-2 gap-2 text-xs'>
                        <dt className='text-muted-foreground capitalize'>
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </dt>
                        <dd className='font-medium break-all'>
                          {typeof value === 'string' || typeof value === 'number'
                            ? String(value)
                            : JSON.stringify(value)}
                        </dd>
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre className='mt-2 overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs'>
                    {JSON.stringify(credential.payload, null, 2)}
                  </pre>
                ))}
            </div>

            {/* Updated data */}
            {formFields.length > 0 ? (
              formFields.map(
                field =>
                  field.type !== 'unsupported' && (
                    <div key={field.name} className='space-y-2'>
                      <Label htmlFor={`update-${field.name}`}>
                        {field.label}
                        {field.required && <span className='ml-0.5 text-destructive'>*</span>}
                      </Label>
                      <Input
                        id={`update-${field.name}`}
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={updateFields[field.name] ?? ''}
                        onChange={e =>
                          setUpdateFields(prev => ({ ...prev, [field.name]: e.target.value }))
                        }
                        minLength={field.minLength}
                        maxLength={field.maxLength}
                      />
                      {field.description && (
                        <p className='text-xs text-muted-foreground'>{field.description}</p>
                      )}
                    </div>
                  ),
              )
            ) : (
              <div className='space-y-2'>
                <Label>Updated data (JSON)</Label>
                <textarea
                  className='w-full rounded-lg border border-border bg-input p-3 font-mono text-xs focus:outline-none focus:border-ring resize-y'
                  rows={6}
                  placeholder={'{\n  "fieldName": "new value"\n}'}
                  onChange={e => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setUpdateFields(parsed);
                    } catch {}
                  }}
                />
              </div>
            )}
          </div>

          {updateError && (
            <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
              {updateError}
            </div>
          )}

          <DialogFooter>
            <Button variant='outline' onClick={() => setUpdateOpen(false)} disabled={updating}>
              Cancel
            </Button>
            <Button onClick={handleRequestUpdate} disabled={updating}>
              {updating ? 'Sending...' : 'Send update request'}
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
      <Button variant='ghost' size='sm' asChild className='-ml-2'>
        <Link href='/wallet/credentials'>
          <ArrowLeft className='h-4 w-4' />
          Back
        </Link>
      </Button>
      <Card className='p-12 text-center'>
        <h2 className='text-lg font-semibold'>Credential not found</h2>
        <p className='mt-2 text-sm text-muted-foreground'>
          This credential does not exist or you do not have access to it.
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
