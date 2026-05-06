'use client';

import { useEffect, useState, useRef } from 'react';
import {
  ShieldOff,
  RefreshCw,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { formatClaimsForDisplay } from '@/lib/sd-jwt';
import { verifySDJwtSignature, type VerificationResult } from '@/lib/jwt-verify';

type RevocationType = 'REVOCATION' | 'UPDATE';

interface RevocationRequest {
  id: string;
  type: RevocationType;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  newClaimData: Record<string, unknown> | null;
  vc: {
    type: string[];
    payload: Record<string, unknown>;
    rawJwt: string;
  };
  holder: {
    id: string;
    email: string;
    organizations: Array<{ name: string; lei: string }>;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function IssuerRevocationRequestsPage() {
  const [requests, setRequests] = useState<RevocationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get<RevocationRequest[]>('/issuer/revocation-requests');
      setRequests(res.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleProcessed = (id: string) => {
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  if (loading) return <RevocationSkeleton />;

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Revocation Requests</h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          Holder requests to revoke or update their credentials.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center'>
          <div className='mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground'>
            <ShieldOff className='h-6 w-6' />
          </div>
          <h3 className='font-semibold'>No pending requests</h3>
          <p className='mt-1.5 text-sm text-muted-foreground'>
            Revocation and update requests from Holders will appear here.
          </p>
        </div>
      ) : (
        <div className='space-y-4'>
          {requests.map(request => (
            <RevocationRequestCard
              key={request.id}
              request={request}
              onProcessed={handleProcessed}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RevocationRequestCard({
  request,
  onProcessed,
}: {
  request: RevocationRequest;
  onProcessed: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pin, setPin] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState('');
  const pinRef = useRef<HTMLInputElement>(null);

  // Verification
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<VerificationResult | null>(null);

  const holderOrg = request.holder.organizations[0];
  const vcType = request.vc.type.length > 1 ? request.vc.type[1] : request.vc.type[0];
  const isUpdate = request.type === 'UPDATE';
  const decodedClaims = formatClaimsForDisplay(request.vc.rawJwt);

  useEffect(() => {
    if (!expanded || verification || verifying) return;
    handleVerify();
  }, [expanded]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const result = await verifySDJwtSignature(request.vc.rawJwt, API_BASE);
      setVerification(result);
    } finally {
      setVerifying(false);
    }
  };

  const handleApprove = async () => {
    if (pin.length !== 4) {
      setError('Enter your PIN to confirm this action');
      pinRef.current?.focus();
      return;
    }
    setApproving(true);
    setError('');
    try {
      await api.post(`/issuer/revocation-requests/${request.id}/approve`, { pin });
      onProcessed(request.id);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to approve request.'));
      setApproving(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    setError('');
    try {
      await api.post(`/issuer/revocation-requests/${request.id}/reject`);
      onProcessed(request.id);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to reject request.'));
      setRejecting(false);
    }
  };

  return (
    <Card className='overflow-hidden'>
      <div className='flex items-start justify-between gap-4 p-5'>
        <div className='flex items-start gap-3 min-w-0'>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isUpdate ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'
            }`}
          >
            {isUpdate ? <RefreshCw className='h-5 w-5' /> : <ShieldOff className='h-5 w-5' />}
          </div>
          <div className='min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <span className='font-semibold'>{vcType}</span>
              <Badge variant={isUpdate ? 'default' : 'warning'}>
                {isUpdate ? 'Update' : 'Revocation'}
              </Badge>
            </div>
            <div className='mt-0.5 text-sm text-muted-foreground truncate'>
              {holderOrg?.name ?? request.holder.email}
              {holderOrg && <span className='ml-2 font-mono text-xs'>LEI {holderOrg.lei}</span>}
            </div>
            <div className='mt-1 text-xs text-muted-foreground'>
              {formatDate(request.createdAt)}
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

      {expanded && (
        <div className='border-t border-border px-5 pb-5 pt-4 space-y-4'>
          {/* Verification */}
          <div className='rounded-lg border border-border p-4'>
            <h3 className='mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
              Cryptographic signature
            </h3>

            {verifying && (
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <Loader2 className='h-4 w-4 animate-spin' />
                Verifying signature...
              </div>
            )}

            {verification && (
              <div className='space-y-3'>
                {/* Status */}
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                    verification.valid
                      ? 'bg-emerald-500/10 text-emerald-700'
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  {verification.valid ? (
                    <ShieldCheck className='h-4 w-4 shrink-0' />
                  ) : (
                    <ShieldAlert className='h-4 w-4 shrink-0' />
                  )}
                  {verification.valid
                    ? "Signature valid — this credential was signed by the issuer's private key"
                    : `Signature invalid — ${verification.error}`}
                </div>

                {/* Details */}
                <dl className='grid gap-2 text-xs'>
                  {verification.issuerDid && (
                    <div className='grid grid-cols-[120px_1fr] gap-2'>
                      <dt className='text-muted-foreground'>Issuer DID</dt>
                      <dd className='break-all font-mono'>{verification.issuerDid}</dd>
                    </div>
                  )}
                  {verification.keyId && (
                    <div className='grid grid-cols-[120px_1fr] gap-2'>
                      <dt className='text-muted-foreground'>Key ID</dt>
                      <dd className='break-all font-mono'>{verification.keyId}</dd>
                    </div>
                  )}
                  {verification.algorithm && (
                    <div className='grid grid-cols-[120px_1fr] gap-2'>
                      <dt className='text-muted-foreground'>Algorithm</dt>
                      <dd className='font-mono'>{verification.algorithm}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>

          {/* Credential data */}
          <div>
            <h3 className='mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
              Credential data
            </h3>
            {decodedClaims ? (
              <div className='rounded-lg border border-border bg-card p-4 space-y-2'>
                {Object.entries(decodedClaims).map(([key, value]) => (
                  <div key={key} className='grid grid-cols-2 gap-2 text-sm'>
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
              <pre className='overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed'>
                {JSON.stringify(request.vc.payload, null, 2)}
              </pre>
            )}
          </div>

          {isUpdate && request.newClaimData && (
            <div>
              <h3 className='mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                Requested new data
              </h3>
              <div className='rounded-lg border border-border bg-card p-4 space-y-2'>
                {Object.entries(request.newClaimData).map(([key, value]) => (
                  <div key={key} className='grid grid-cols-2 gap-2 text-sm'>
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
            </div>
          )}

          <div className='max-w-xs space-y-2'>
            <Label htmlFor={`pin-${request.id}`}>
              Your PIN{' '}
              <span className='text-muted-foreground text-xs'>
                {isUpdate ? '(to sign the new credential)' : '(to confirm revocation)'}
              </span>
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
            <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{error}</div>
          )}

          <div className='flex gap-3'>
            <Button
              onClick={handleApprove}
              disabled={approving || rejecting || pin.length !== 4}
              className='bg-emerald-600 text-white hover:bg-emerald-700'
            >
              <Check className='h-4 w-4' />
              {approving ? 'Processing...' : isUpdate ? 'Approve & Re-issue' : 'Approve revocation'}
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
      )}
    </Card>
  );
}

function RevocationSkeleton() {
  return (
    <div className='space-y-6'>
      <div>
        <Skeleton className='h-7 w-56' />
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
