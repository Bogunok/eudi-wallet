'use client';

import { useState, useRef } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Building2,
  Link2,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

// ---- Types ----

interface SessionPublic {
  sessionId: string;
  requestedType: string;
  requestedFields: string[];
  purpose: string | null;
  verifier: { name: string; lei: string | null };
  createdAt: string;
}

interface WalletCredential {
  id: string;
  type: string[];
  payload: Record<string, unknown>;
  status: string;
}

type Step = 'paste' | 'loading-session' | 'consent' | 'submitting' | 'success' | 'error';

// ---- Main page ----

export default function VerifyPage() {
  const [step, setStep] = useState<Step>('paste');

  // Paste step
  const [rawLink, setRawLink] = useState('');
  const [linkError, setLinkError] = useState('');

  // Session data
  const [session, setSession] = useState<SessionPublic | null>(null);
  const [sessionId, setSessionId] = useState('');

  // Consent step
  const [credentials, setCredentials] = useState<WalletCredential[]>([]);
  const [selectedCredentialId, setSelectedCredentialId] = useState('');
  const [availableClaims, setAvailableClaims] = useState<string[]>([]);
  const [credError, setCredError] = useState('');

  // PIN
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Result
  const [errorMessage, setErrorMessage] = useState('');

  // ---- parse link and load session ----

  const handleProceed = async () => {
    setLinkError('');

    // два формати:
    // 1. openid4vp://?...&presentation_definition=...  (повний OID4VP URL)
    // 2. Просто UUID сесії
    let sid = '';

    if (rawLink.startsWith('openid4vp://')) {
      try {
        const paramStr = rawLink.replace('openid4vp://?', '');
        const params = new URLSearchParams(paramStr);
        const responseUri = params.get('response_uri');
        if (responseUri) {
          const match = responseUri.match(/\/verifier\/response\/([^/?]+)/);
          if (match) sid = match[1];
        }
      } catch {
        setLinkError('Could not parse the link. Make sure you copied it correctly.');
        return;
      }
    } else {
      sid = rawLink.trim();
    }

    if (!sid) {
      setLinkError('Could not extract session ID from this link.');
      return;
    }

    setStep('loading-session');

    try {
      // Завантажуємо публічні деталі сесії
      const [sessionRes, orgRes] = await Promise.all([
        api.get<SessionPublic>(`/verifier/sessions/${sid}/public`),
        api.get<{ id: string }>('/organization/my'),
      ]);

      const sess = sessionRes.data;
      const credRes = await api.get<WalletCredential[]>(`/vc/org/${orgRes.data.id}`);
      const creds = credRes.data;

      setSession(sess);
      setSessionId(sid);

      const matching = creds.filter(
        c => c.status === 'ACTIVE' && c.type.includes(sess.requestedType),
      );
      setCredentials(matching);
      setCredError('');

      if (matching.length === 1) {
        handleSelectCredential(matching[0], sess.requestedFields);
      }

      setStep('consent');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 404) {
        setErrorMessage('Verification session not found. The link may be expired or invalid.');
      } else if (status === 400) {
        setErrorMessage('This verification session is no longer active.');
      } else {
        setErrorMessage('Could not load session details. Please try again.');
      }
      setStep('error');
    }
  };

  const handleSelectCredential = (cred: WalletCredential, requestedFields?: string[]) => {
    setSelectedCredentialId(cred.id);
    const fields = requestedFields ?? session?.requestedFields ?? [];
    const payloadKeys = Object.keys(cred.payload ?? {});
    const intersection = fields.filter(f => payloadKeys.includes(f));
    setAvailableClaims(intersection);
  };

  // ---- submit presentation ----

  const handleSubmit = async () => {
    if (!session || !selectedCredentialId || pin.length !== 4) return;

    setStep('submitting');

    try {
      await api.post('/wallet/present-credential', {
        credentialId: selectedCredentialId,
        sessionId,
        discloseClaims: availableClaims,
        pin,
      });
      setStep('success');
    } catch (err: unknown) {
      setErrorMessage(
        extractErrorMessage(err, 'Verification failed. Check your PIN or try again.'),
      );
      setStep('error');
    }
  };

  const handleReset = () => {
    setStep('paste');
    setRawLink('');
    setLinkError('');
    setSession(null);
    setSessionId('');
    setCredentials([]);
    setSelectedCredentialId('');
    setAvailableClaims([]);
    setPin('');
    setErrorMessage('');
  };

  // ---- Render ----

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-2'>
        <Button variant='ghost' size='sm' asChild className='-ml-2'>
          <Link href='/wallet'>
            <ArrowLeft className='h-4 w-4' />
            Back
          </Link>
        </Button>
      </div>

      <div className='flex items-start gap-3'>
        <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent'>
          <ShieldCheck className='h-6 w-6' />
        </div>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Verify Identity</h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            Present your verifiable credential to a trusted verifier.
          </p>
        </div>
      </div>

      {step === 'paste' && (
        <PasteStep
          value={rawLink}
          onChange={setRawLink}
          onProceed={handleProceed}
          error={linkError}
        />
      )}

      {step === 'loading-session' && (
        <Card className='flex items-center justify-center gap-3 p-12 text-muted-foreground'>
          <Loader2 className='h-5 w-5 animate-spin' />
          Loading session details…
        </Card>
      )}

      {step === 'consent' && session && (
        <ConsentStep
          session={session}
          credentials={credentials}
          selectedCredentialId={selectedCredentialId}
          availableClaims={availableClaims}
          credError={credError}
          pin={pin}
          showPin={showPin}
          onSelectCredential={cred => handleSelectCredential(cred)}
          onPinChange={setPin}
          onTogglePin={() => setShowPin(v => !v)}
          onSubmit={handleSubmit}
          onCancel={handleReset}
        />
      )}

      {step === 'submitting' && (
        <Card className='flex items-center justify-center gap-3 p-12 text-muted-foreground'>
          <Loader2 className='h-5 w-5 animate-spin' />
          Sending presentation…
        </Card>
      )}

      {step === 'success' && <SuccessScreen onDone={handleReset} />}

      {step === 'error' && <ErrorScreen message={errorMessage} onRetry={handleReset} />}
    </div>
  );
}

// ---- Step components ----

function PasteStep({
  value,
  onChange,
  onProceed,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onProceed: () => void;
  error: string;
}) {
  return (
    <Card className='p-6 space-y-5'>
      <div className='space-y-1'>
        <h2 className='font-semibold'>Paste the verification link</h2>
        <p className='text-sm text-muted-foreground'>
          The verifier will share a link (or a session ID) with you. Paste it below to see what they
          are requesting.
        </p>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='verify-link'>Verification link or session ID</Label>
        <div className='flex gap-2'>
          <Input
            id='verify-link'
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder='openid4vp://?… or session UUID'
            className='font-mono text-xs'
            onKeyDown={e => e.key === 'Enter' && value.trim() && onProceed()}
          />
          <Button onClick={onProceed} disabled={!value.trim()}>
            <Link2 className='h-4 w-4' />
            Proceed
          </Button>
        </div>
        {error && (
          <p className='flex items-center gap-1.5 text-sm text-destructive'>
            <AlertCircle className='h-4 w-4 shrink-0' />
            {error}
          </p>
        )}
      </div>

      <div className='rounded-lg border border-dashed border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1'>
        <p className='font-medium text-foreground'>How to get this link?</p>
        <p>
          Ask the verifier (e.g. your bank) to generate a verification request and send you the
          link.
        </p>
        <p>
          Alternatively, the verifier may display a QR code — scanning it will open this page
          automatically.
        </p>
      </div>
    </Card>
  );
}

function ConsentStep({
  session,
  credentials,
  selectedCredentialId,
  availableClaims,
  credError,
  pin,
  showPin,
  onSelectCredential,
  onPinChange,
  onTogglePin,
  onSubmit,
  onCancel,
}: {
  session: SessionPublic;
  credentials: WalletCredential[];
  selectedCredentialId: string;
  availableClaims: string[];
  credError: string;
  pin: string;
  showPin: boolean;
  onSelectCredential: (cred: WalletCredential) => void;
  onPinChange: (v: string) => void;
  onTogglePin: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const pinRef = useRef<HTMLInputElement | null>(null);
  const canSubmit = selectedCredentialId && pin.length === 4;

  return (
    <div className='space-y-4'>
      {/* Verifier identity */}
      <Card className='p-5 space-y-4'>
        <div className='flex items-center gap-3'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent'>
            <Building2 className='h-5 w-5' />
          </div>
          <div>
            <div className='font-semibold'>{session.verifier.name}</div>
            {session.verifier.lei && (
              <div className='text-xs font-mono text-muted-foreground'>
                LEI {session.verifier.lei}
              </div>
            )}
          </div>
          <Badge className='ml-auto bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0'>
            Trusted verifier
          </Badge>
        </div>

        {session.purpose && (
          <div className='rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm'>
            <span className='font-medium'>Purpose: </span>
            {session.purpose}
          </div>
        )}
      </Card>

      {/* What will be disclosed */}
      <Card className='p-5 space-y-3'>
        <h2 className='font-semibold text-sm uppercase tracking-wide text-muted-foreground'>
          Requested data
        </h2>
        <p className='text-sm text-muted-foreground'>
          The verifier is requesting a{' '}
          <span className='font-mono font-medium text-foreground'>{session.requestedType}</span>{' '}
          credential with the following fields:
        </p>
        <div className='flex flex-wrap gap-2'>
          {session.requestedFields.map(field => (
            <span
              key={field}
              className='inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs font-medium text-accent'
            >
              <CheckCircle2 className='h-3 w-3' />
              {field}
            </span>
          ))}
        </div>
        <p className='text-xs text-muted-foreground'>
          Only these fields will be shared. All other data in your credential stays private.
        </p>
      </Card>

      {/* Credential selector */}
      <Card className='p-5 space-y-3'>
        <h2 className='font-semibold text-sm uppercase tracking-wide text-muted-foreground'>
          Choose a credential to present
        </h2>

        {credentials.length === 0 ? (
          <div className='flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800'>
            <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' />
            <div>
              <p className='font-medium'>No matching credential found</p>
              <p className='mt-0.5'>
                You do not have an active <span className='font-mono'>{session.requestedType}</span>{' '}
                credential in your wallet. Request one from a trusted issuer first.
              </p>
            </div>
          </div>
        ) : (
          <div className='space-y-2'>
            {credentials.map(cred => {
              const isSelected = selectedCredentialId === cred.id;
              const credType = cred.type[1] ?? cred.type[0];
              return (
                <button
                  key={cred.id}
                  onClick={() => onSelectCredential(cred)}
                  className={[
                    'w-full rounded-xl border p-4 text-left transition-all',
                    isSelected
                      ? 'border-accent bg-accent/5 ring-2 ring-accent/30'
                      : 'border-border hover:border-accent/40',
                  ].join(' ')}
                >
                  <div className='flex items-center justify-between'>
                    <span className='font-medium text-sm'>{credType}</span>
                    {isSelected && <CheckCircle2 className='h-4 w-4 text-accent' />}
                  </div>
                  {/* Показуємо тільки запитані поля */}
                  {isSelected && availableClaims.length > 0 && (
                    <div className='mt-2 space-y-1'>
                      {availableClaims.map(claim => {
                        const val = (cred.payload as Record<string, unknown>)[claim];
                        return (
                          <div key={claim} className='grid grid-cols-[140px_1fr] gap-2 text-xs'>
                            <dt className='text-muted-foreground'>{claim}</dt>
                            <dd className='font-mono truncate'>{String(val ?? '—')}</dd>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {credError && <p className='text-sm text-destructive'>{credError}</p>}
      </Card>

      {/* PIN */}
      {selectedCredentialId && (
        <Card className='p-5 space-y-3'>
          <h2 className='font-semibold text-sm uppercase tracking-wide text-muted-foreground'>
            Confirm with your wallet PIN
          </h2>
          <p className='text-sm text-muted-foreground'>
            Enter your PIN to sign and send the presentation.
          </p>
          <div className='flex items-center gap-2 max-w-xs'>
            <Input
              ref={pinRef}
              type={showPin ? 'text' : 'password'}
              inputMode='numeric'
              maxLength={4}
              value={pin}
              onChange={e => onPinChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder='••••'
              className='text-center text-xl tracking-widest font-mono'
            />
            <Button variant='ghost' size='icon' onClick={onTogglePin} tabIndex={-1}>
              {showPin ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
            </Button>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className='flex justify-between gap-3'>
        <Button variant='outline' onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={!canSubmit}
          className='bg-accent text-accent-foreground hover:bg-accent/90'
        >
          <ShieldCheck className='h-4 w-4' />
          Share & Verify
        </Button>
      </div>
    </div>
  );
}

function SuccessScreen({ onDone }: { onDone: () => void }) {
  return (
    <Card className='flex flex-col items-center gap-4 p-12 text-center'>
      <div className='flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100'>
        <CheckCircle2 className='h-8 w-8 text-emerald-600' />
      </div>
      <div>
        <h2 className='text-xl font-semibold'>Verification successful</h2>
        <p className='mt-2 text-sm text-muted-foreground'>
          Your credential was shared and verified. The verifier has confirmed your identity.
        </p>
      </div>
      <Button onClick={onDone} variant='outline'>
        Done
      </Button>
    </Card>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className='flex flex-col items-center gap-4 p-12 text-center'>
      <div className='flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10'>
        <XCircle className='h-8 w-8 text-destructive' />
      </div>
      <div>
        <h2 className='text-xl font-semibold'>Something went wrong</h2>
        <p className='mt-2 text-sm text-muted-foreground'>{message}</p>
      </div>
      <Button onClick={onRetry} variant='outline'>
        Try again
      </Button>
    </Card>
  );
}

// ---- Helpers ----

function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message[0] ?? fallback;
    if (typeof message === 'string') return message;
  }
  return fallback;
}
