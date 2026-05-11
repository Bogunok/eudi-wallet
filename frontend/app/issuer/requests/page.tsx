'use client';

import { useEffect, useState, useRef } from 'react';
import { ClipboardList, Check, X, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';

interface CredentialRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  claimData: Record<string, unknown>;
  createdAt: string;
  schema: { id: string; name: string; schemaId: string };
  holder: {
    id: string;
    email: string;
    organizations: Array<{ name: string; lei: string }>;
    didDocuments: Array<{ did: string }>;
  };
}

export default function IssuerRequestsPage() {
  const [requests, setRequests] = useState<CredentialRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get<CredentialRequest[]>('/issuer/requests');
      setRequests(res.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleApproved = (id: string) => {
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  const handleRejected = (id: string) => {
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  if (loading) return <RequestsSkeleton />;

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Pending Requests</h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          Review and process credential requests from Holders.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center'>
          <div className='mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground'>
            <ClipboardList className='h-6 w-6' />
          </div>
          <h3 className='font-semibold'>No pending requests</h3>
          <p className='mt-1.5 text-sm text-muted-foreground'>
            New requests from Holders will appear here.
          </p>
        </div>
      ) : (
        <div className='space-y-4'>
          {requests.map(request => (
            <RequestCard
              key={request.id}
              request={request}
              onApproved={handleApproved}
              onRejected={handleRejected}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({
  request,
  onApproved,
  onRejected,
}: {
  request: CredentialRequest;
  onApproved: (id: string) => void;
  onRejected: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pin, setPin] = useState('');
  const [assignedLei, setAssignedLei] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState('');
  const pinRef = useRef<HTMLInputElement | null>(null);

  const holderOrg = request.holder.organizations[0];
  const holderDid = request.holder.didDocuments?.[0]?.did ?? null;
  const hasDid = Boolean(holderDid);
  const isLeiSchema = request.schema.name === 'LEI';

  const canApprove =
    pin.length === 4 && (hasDid || isLeiSchema) && (!isLeiSchema || assignedLei.length === 20);

  const handleApprove = async () => {
    if (!canApprove) {
      if (pin.length !== 4) {
        setError('Enter your 4-digit PIN to sign the credential');
        pinRef.current?.focus();
      } else if (isLeiSchema && assignedLei.length !== 20) {
        setError('Enter a valid 20-character LEI code to assign');
      }
      return;
    }
    setApproving(true);
    setError('');
    try {
      await api.post(`/issuer/requests/${request.id}/approve`, {
        pin,
        ...(isLeiSchema ? { assignedLei } : {}),
      });
      onApproved(request.id);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to approve. Check your PIN.'));
      setApproving(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    setError('');
    try {
      await api.post(`/issuer/requests/${request.id}/reject`, {});
      onRejected(request.id);
    } catch {
      onRejected(request.id);
    } finally {
      setRejecting(false);
    }
  };

  return (
    <Card className='overflow-hidden'>
      {/* Header */}
      <div className='flex items-start justify-between gap-4 p-5'>
        <div className='flex items-start gap-3 min-w-0'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent'>
            <Building2 className='h-5 w-5' />
          </div>
          <div className='min-w-0'>
            <div className='font-semibold truncate'>{holderOrg?.name ?? request.holder.email}</div>
            {holderOrg && (
              <div className='text-xs text-muted-foreground font-mono truncate'>
                LEI {holderOrg.lei}
              </div>
            )}
            <div className='mt-1 text-xs text-muted-foreground'>{request.holder.email}</div>
            <div className='mt-1 flex items-center gap-2'>
              <Badge variant='secondary'>{request.schema.name}</Badge>
              <span className='text-xs text-muted-foreground'>{formatDate(request.createdAt)}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className='shrink-0 text-muted-foreground hover:text-foreground transition-colors'
        >
          {expanded ? <ChevronUp className='h-5 w-5' /> : <ChevronDown className='h-5 w-5' />}
        </button>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className='border-t border-border px-5 pb-5 pt-4 space-y-4'>
          {/* Holder identity */}
          <div className='rounded-lg border border-border p-4 space-y-2'>
            <h3 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
              Holder identity
            </h3>
            <div className='grid gap-2'>
              <div className='grid grid-cols-[80px_1fr] gap-2 text-xs'>
                <dt className='text-muted-foreground'>Email</dt>
                <dd>{request.holder.email}</dd>
              </div>
              <div className='grid grid-cols-[80px_1fr] gap-2 text-xs'>
                <dt className='text-muted-foreground'>DID</dt>
                <dd className='font-mono break-all'>
                  {holderDid ?? (
                    <span
                      className={
                        isLeiSchema
                          ? 'text-muted-foreground font-sans'
                          : 'text-destructive font-sans'
                      }
                    >
                      {isLeiSchema
                        ? 'No DID yet (acceptable for LEI)'
                        : 'No DID — credential cannot be issued'}
                    </span>
                  )}
                </dd>
              </div>
            </div>
          </div>

          {!hasDid && !isLeiSchema && (
            <div className='rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800'>
              This holder has not set up a DID yet. Ask them to go to Organization → Create DID
              before you can issue a credential.
            </div>
          )}
          {!hasDid && isLeiSchema && (
            <div className='rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800'>
              This holder has no DID yet — that's expected for a first LEI Credential request. The
              credential will be issued using their email as a temporary identifier. They can create
              a DID after registering their organization.
            </div>
          )}

          {/* Submitted data */}
          <div>
            <h3 className='mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
              Submitted data
            </h3>
            <pre className='overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed'>
              {JSON.stringify(request.claimData, null, 2)}
            </pre>
          </div>

          {/* LEI assignment — тільки для LEI схеми */}
          {isLeiSchema && (
            <div className='rounded-lg border border-accent/20 bg-accent/5 p-4 space-y-3'>
              <div>
                <h3 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                  Assign LEI Code
                </h3>
                <p className='mt-1 text-xs text-muted-foreground'>
                  As the issuing authority, you assign the LEI code to this organization. The holder
                  did not provide it — you generate or look it up and enter it here.
                </p>
              </div>
              <div className='max-w-xs space-y-2'>
                <Label htmlFor={`lei-${request.id}`}>LEI Code</Label>
                <Input
                  id={`lei-${request.id}`}
                  value={assignedLei}
                  onChange={e =>
                    setAssignedLei(
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, '')
                        .slice(0, 20),
                    )
                  }
                  placeholder='20-character LEI code'
                  maxLength={20}
                  className='font-mono tracking-wider'
                />
                <p className='text-xs text-muted-foreground'>
                  {assignedLei.length}/20 characters
                  {assignedLei.length === 20 && (
                    <span className='ml-2 text-emerald-600 font-medium'>✓ Valid length</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* PIN + actions */}
          <div className='space-y-3'>
            <div className='max-w-xs space-y-2'>
              <Label htmlFor={`pin-${request.id}`}>
                Your PIN <span className='text-muted-foreground'>(to sign the credential)</span>
              </Label>
              <Input
                ref={pinRef}
                id={`pin-${request.id}`}
                type='password'
                inputMode='numeric'
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder='••••'
              />
            </div>

            {error && (
              <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
                {error}
              </div>
            )}

            <div className='flex gap-3'>
              <Button
                onClick={handleApprove}
                disabled={approving || rejecting || !canApprove}
                className='bg-emerald-600 text-white hover:bg-emerald-700'
                title={
                  !hasDid
                    ? 'Cannot approve: holder has no DID'
                    : isLeiSchema && assignedLei.length !== 20
                      ? 'Enter a 20-character LEI code'
                      : undefined
                }
              >
                <Check className='h-4 w-4' />
                {approving ? 'Issuing...' : 'Approve & Issue'}
              </Button>
              <Button
                variant='outline'
                onClick={handleReject}
                disabled={approving || rejecting}
                className='border-destructive/40 text-destructive hover:bg-destructive/10'
              >
                <X className='h-4 w-4' />
                {rejecting ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function RequestsSkeleton() {
  return (
    <div className='space-y-6'>
      <div>
        <Skeleton className='h-7 w-48' />
        <Skeleton className='mt-2 h-4 w-72' />
      </div>
      <div className='space-y-4'>
        {[1, 2].map(i => (
          <Skeleton key={i} className='h-24' />
        ))}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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
