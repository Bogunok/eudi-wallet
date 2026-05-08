'use client';

import { useState } from 'react';
import { ShieldCheck, Link2, Copy, Check, AlertCircle, Loader2, Plus, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

interface VerificationSession {
  sessionId: string;
  nonce: string;
  walletRequestUrl: string;
  presentationDefinition: unknown;
}

// Відомі типи кредентіалів з типовими полями для швидкого вибору
const CREDENTIAL_PRESETS: Record<string, { fields: string[]; label: string }> = {
  LEICredential: {
    label: 'LEI Credential',
    fields: ['lei', 'legalName', 'entityStatus', 'leiStatus'],
  },
  BusinessRegistrationCredential: {
    label: 'Business Registration',
    fields: ['registrationNumber', 'legalName', 'country', 'registrationDate'],
  },
  TaxCredential: {
    label: 'Tax Credential',
    fields: ['taxId', 'legalName', 'taxStatus'],
  },
};

const ALL_CREDENTIAL_TYPES = Object.keys(CREDENTIAL_PRESETS);

export default function VerifierDashboardPage() {
  const [requestedType, setRequestedType] = useState('LEICredential');
  const [customType, setCustomType] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>(
    CREDENTIAL_PRESETS['LEICredential'].fields,
  );
  const [customField, setCustomField] = useState('');
  const [purpose, setPurpose] = useState('');

  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<VerificationSession | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const effectiveType = requestedType === '__custom__' ? customType.trim() : requestedType;
  const preset = CREDENTIAL_PRESETS[requestedType];

  const handleTypeChange = (type: string) => {
    setRequestedType(type);
    if (type !== '__custom__' && CREDENTIAL_PRESETS[type]) {
      setSelectedFields(CREDENTIAL_PRESETS[type].fields);
    } else if (type === '__custom__') {
      setSelectedFields([]);
    }
  };

  const toggleField = (field: string) => {
    setSelectedFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field],
    );
  };

  const addCustomField = () => {
    const f = customField.trim();
    if (!f || selectedFields.includes(f)) return;
    setSelectedFields(prev => [...prev, f]);
    setCustomField('');
  };

  const removeField = (field: string) => {
    setSelectedFields(prev => prev.filter(f => f !== field));
  };

  const handleCreate = async () => {
    if (!effectiveType || selectedFields.length === 0) {
      setError('Please specify a credential type and at least one field.');
      return;
    }
    setLoading(true);
    setError('');
    setSession(null);
    try {
      const res = await api.post<VerificationSession>('/verifier/requests', {
        requestedType: effectiveType,
        requestedFields: selectedFields,
        purpose: purpose.trim() || undefined,
      });
      setSession(res.data);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to create verification request.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!session) return;
    await navigator.clipboard.writeText(session.walletRequestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setSession(null);
    setError('');
  };

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Create Verification Request</h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          Generate a link for the holder to present their verifiable credential.
        </p>
      </div>

      {!session ? (
        <div className='space-y-4'>
          {/* Credential type */}
          <Card className='p-6 space-y-4'>
            <StepHeader number={1} title='Credential type' />

            <div className='flex flex-wrap gap-2'>
              {ALL_CREDENTIAL_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => handleTypeChange(t)}
                  className={chip(requestedType === t)}
                >
                  {CREDENTIAL_PRESETS[t].label}
                </button>
              ))}
              <button
                onClick={() => handleTypeChange('__custom__')}
                className={chip(requestedType === '__custom__')}
              >
                Custom…
              </button>
            </div>

            {requestedType === '__custom__' && (
              <div className='space-y-2 max-w-sm'>
                <Label htmlFor='custom-type'>Custom credential type</Label>
                <Input
                  id='custom-type'
                  placeholder='e.g. DriverLicenseCredential'
                  value={customType}
                  onChange={e => setCustomType(e.target.value)}
                />
              </div>
            )}
          </Card>

          {/* Fields */}
          <Card className='p-6 space-y-4'>
            <StepHeader number={2} title='Fields to request (selective disclosure)' />
            <p className='text-sm text-muted-foreground'>
              Only the selected fields will be shared by the holder. All other credential data stays
              private.
            </p>

            {/* Preset fields */}
            {preset && (
              <div className='space-y-2'>
                <p className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
                  Available fields for {preset.label}
                </p>
                <div className='flex flex-wrap gap-2'>
                  {preset.fields.map(field => (
                    <button
                      key={field}
                      onClick={() => toggleField(field)}
                      className={[
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        selectedFields.includes(field)
                          ? 'border-accent bg-accent text-white'
                          : 'border-border bg-background hover:border-accent/50',
                      ].join(' ')}
                    >
                      {field}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected fields summary */}
            {selectedFields.length > 0 && (
              <div className='space-y-2'>
                <p className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
                  Will request
                </p>
                <div className='flex flex-wrap gap-2'>
                  {selectedFields.map(f => (
                    <span
                      key={f}
                      className='inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/5 pl-3 pr-1.5 py-1 text-xs font-medium text-accent'
                    >
                      {f}
                      <button
                        onClick={() => removeField(f)}
                        className='hover:text-destructive transition-colors'
                      >
                        <X className='h-3 w-3' />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Add custom field */}
            <div className='flex gap-2 max-w-sm'>
              <Input
                placeholder='Add custom field name…'
                value={customField}
                onChange={e => setCustomField(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomField()}
                className='text-sm'
              />
              <Button variant='outline' size='icon' onClick={addCustomField}>
                <Plus className='h-4 w-4' />
              </Button>
            </div>
          </Card>

          {/* Purpose */}
          <Card className='p-6 space-y-4'>
            <StepHeader number={3} title='Purpose (shown to the holder)' />
            <div className='space-y-2 max-w-lg'>
              <Input
                placeholder='e.g. Verification of legal entity status for opening a corporate account'
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
              />
              <p className='text-xs text-muted-foreground'>
                Optional. The holder will see this text on their consent screen.
              </p>
            </div>
          </Card>

          {error && (
            <div className='flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive'>
              <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' />
              {error}
            </div>
          )}

          <Button
            onClick={handleCreate}
            disabled={
              loading ||
              !effectiveType ||
              selectedFields.length === 0 ||
              (requestedType === '__custom__' && !customType.trim())
            }
            size='lg'
          >
            {loading ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin' />
                Creating…
              </>
            ) : (
              <>
                <Link2 className='h-4 w-4' />
                Generate Request Link
              </>
            )}
          </Button>
        </div>
      ) : (
        /* Result */
        <div className='space-y-4'>
          <Card className='p-6 space-y-5'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600'>
                  <ShieldCheck className='h-5 w-5' />
                </div>
                <div>
                  <div className='font-semibold'>Verification Request Created</div>
                  <div className='text-xs text-muted-foreground'>
                    Session ID: <span className='font-mono'>{session.sessionId.slice(0, 8)}…</span>
                  </div>
                </div>
              </div>
              <Badge className='bg-amber-100 text-amber-700 border-amber-200'>PENDING</Badge>
            </div>

            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div className='space-y-1'>
                <p className='text-xs text-muted-foreground uppercase tracking-wide'>Type</p>
                <p className='font-mono'>{effectiveType}</p>
              </div>
              <div className='space-y-1'>
                <p className='text-xs text-muted-foreground uppercase tracking-wide'>
                  Requested fields
                </p>
                <p>{selectedFields.join(', ')}</p>
              </div>
              {purpose && (
                <div className='col-span-2 space-y-1'>
                  <p className='text-xs text-muted-foreground uppercase tracking-wide'>Purpose</p>
                  <p>{purpose}</p>
                </div>
              )}
            </div>

            <div className='space-y-2'>
              <Label>Wallet Request Link</Label>
              <p className='text-xs text-muted-foreground'>
                Share this link with the holder. They paste it into{' '}
                <span className='font-medium'>Wallet → Verify Identity</span>.
              </p>
              <div className='flex gap-2'>
                <div className='flex-1 overflow-hidden rounded-lg border border-border bg-muted px-3 py-2 text-xs font-mono break-all'>
                  {session.walletRequestUrl}
                </div>
                <Button variant='outline' size='icon' onClick={handleCopy} title='Copy link'>
                  {copied ? (
                    <Check className='h-4 w-4 text-emerald-500' />
                  ) : (
                    <Copy className='h-4 w-4' />
                  )}
                </Button>
              </div>
            </div>

            <div className='rounded-lg border border-border bg-card/50 p-4 space-y-1 text-xs text-muted-foreground'>
              <p className='font-medium text-foreground'>What happens next?</p>
              <ol className='list-decimal list-inside space-y-1 mt-1'>
                <li>Copy the link and send it to the holder.</li>
                <li>
                  Holder opens <span className='font-medium'>Wallet → Verify Identity</span> and
                  pastes the link.
                </li>
                <li>
                  They see your identity, the purpose, and exactly which fields will be shared.
                </li>
                <li>They confirm with their PIN — only the requested fields are sent.</li>
                <li>
                  Check{' '}
                  <a href='/verifier/sessions' className='underline text-accent'>
                    Sessions
                  </a>{' '}
                  to see the result.
                </li>
              </ol>
            </div>
          </Card>

          <Button variant='outline' onClick={handleReset}>
            Create another request
          </Button>
        </div>
      )}
    </div>
  );
}

// ---- Helpers ----

function StepHeader({ number, title }: { number: number; title: string }) {
  return (
    <div className='flex items-center gap-3'>
      <span className='flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-semibold'>
        {number}
      </span>
      <h2 className='text-base font-semibold'>{title}</h2>
    </div>
  );
}

function chip(active: boolean) {
  return [
    'rounded-full border px-3 py-1 text-sm font-medium transition-colors',
    active
      ? 'border-accent bg-accent text-white'
      : 'border-border bg-background hover:border-accent/50',
  ].join(' ');
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
