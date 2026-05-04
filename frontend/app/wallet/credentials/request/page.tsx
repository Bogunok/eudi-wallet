'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FilePlus2, Send, Building2, FileBadge, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { type AvailableSchema, getIssuerDisplayName, getIssuerLei } from '@/lib/vc-types';
import { parseSchemaFields, type FormField } from '@/lib/json-schema';

// issuer → type → fields → pin.
type Step = 1 | 2 | 3 | 4;

export default function RequestCredentialPage() {
  const router = useRouter();

  const [schemas, setSchemas] = useState<AvailableSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [issuerId, setIssuerId] = useState<string | null>(null);
  const [schemaId, setSchemaId] = useState<string | null>(null);
  const [claimData, setClaimData] = useState<Record<string, string>>({});
  const [pin, setPin] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<AvailableSchema[]>('/schemas/available');
        if (!cancelled) setSchemas(res.data);
      } catch {
        if (!cancelled) setLoadError('Could not load available credential types.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const issuers = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; lei: string | null }>();
    for (const schema of schemas) {
      if (!seen.has(schema.issuerId)) {
        seen.set(schema.issuerId, {
          id: schema.issuerId,
          name: getIssuerDisplayName(schema),
          lei: getIssuerLei(schema),
        });
      }
    }
    return Array.from(seen.values());
  }, [schemas]);

  const issuerSchemas = useMemo(() => {
    if (!issuerId) return [];
    return schemas.filter(s => s.issuerId === issuerId);
  }, [issuerId, schemas]);

  const selectedSchema = useMemo(() => {
    return schemas.find(s => s.id === schemaId) ?? null;
  }, [schemaId, schemas]);

  const formFields: FormField[] = useMemo(() => {
    if (!selectedSchema) return [];
    return parseSchemaFields(selectedSchema.structure);
  }, [selectedSchema]);

  const currentStep: Step = !issuerId ? 1 : !schemaId ? 2 : pin.length !== 4 ? 3 : 4;

  const isFormValid =
    selectedSchema &&
    formFields.every(f => !f.required || claimData[f.name]?.trim()) &&
    pin.length === 4;

  const handleSelectIssuer = (id: string) => {
    setIssuerId(id);
    setSchemaId(null);
    setClaimData({});
  };

  const handleSelectSchema = (id: string) => {
    setSchemaId(id);
    setClaimData({});
  };

  const handleClaimChange = (name: string, value: string) => {
    setClaimData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchema || !isFormValid) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      await api.post('/wallet/request', {
        issuerId: selectedSchema.issuerId,
        schemaId: selectedSchema.id,
        claimData,
        pin,
      });

      router.push('/wallet/credentials?requested=1');
    } catch (err: unknown) {
      setSubmitError(
        extractErrorMessage(err, 'Could not submit request. Check your PIN and data.'),
      );
      setSubmitting(false);
    }
  };

  if (loading) return <RequestSkeleton />;

  if (loadError) {
    return (
      <div className='space-y-6'>
        <BackLink />
        <Card className='border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive'>
          {loadError}
        </Card>
      </div>
    );
  }

  if (issuers.length === 0) {
    return (
      <div className='space-y-6'>
        <BackLink />
        <Card className='p-12 text-center'>
          <AlertCircle className='mx-auto mb-4 h-8 w-8 text-muted-foreground' />
          <h2 className='text-lg font-semibold'>No trusted issuers available</h2>
          <p className='mt-2 text-sm text-muted-foreground'>
            There are no issuers registered in the system yet. Please ask an admin to register one.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <BackLink />

      <div className='flex items-start gap-3'>
        <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent'>
          <FilePlus2 className='h-6 w-6' />
        </div>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Add document</h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            Choose a trusted issuer, the type of credential, and provide the required information.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className='space-y-6'>
        {/* Step 1 — Issuer */}
        <Card className='p-6'>
          <StepHeader number={1} title='Choose a trusted issuer' active={currentStep >= 1} />
          <div className='mt-4 grid gap-3 sm:grid-cols-2'>
            {issuers.map(issuer => {
              const isSelected = issuerId === issuer.id;
              return (
                <button
                  key={issuer.id}
                  type='button'
                  onClick={() => handleSelectIssuer(issuer.id)}
                  className={cardButtonClass(isSelected)}
                >
                  <div className='flex items-start gap-3'>
                    <Building2 className='mt-0.5 h-4 w-4 shrink-0 text-muted-foreground' />
                    <div className='min-w-0'>
                      <div className='font-medium truncate'>{issuer.name}</div>
                      {issuer.lei && (
                        <div className='mt-0.5 font-mono text-xs text-muted-foreground truncate'>
                          LEI {issuer.lei}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Step 2 — Type */}
        {issuerId && (
          <Card className='p-6'>
            <StepHeader number={2} title='Choose a credential type' active={currentStep >= 2} />
            {issuerSchemas.length === 0 ? (
              <div className='mt-4 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground'>
                This issuer has no credential types defined yet.
              </div>
            ) : (
              <div className='mt-4 grid gap-3 sm:grid-cols-2'>
                {issuerSchemas.map(schema => {
                  const isSelected = schemaId === schema.id;
                  return (
                    <button
                      key={schema.id}
                      type='button'
                      onClick={() => handleSelectSchema(schema.id)}
                      className={cardButtonClass(isSelected)}
                    >
                      <div className='flex items-start gap-3'>
                        <FileBadge className='mt-0.5 h-4 w-4 shrink-0 text-muted-foreground' />
                        <div className='min-w-0'>
                          <div className='font-medium truncate'>{schema.name}</div>
                          <div className='mt-0.5 font-mono text-xs text-muted-foreground truncate'>
                            {schema.schemaId}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* Step 3 — Fields (динамічно з JSON Schema) */}
        {selectedSchema && (
          <Card className='p-6'>
            <StepHeader number={3} title='Fill in the details' active={currentStep >= 3} />
            <p className='mt-1 text-xs text-muted-foreground'>
              These values will be sent to the issuer for verification.
            </p>
            <div className='mt-4 space-y-4'>
              {formFields.length === 0 && (
                <p className='rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground'>
                  This credential does not require any input fields.
                </p>
              )}
              {formFields.map(field => (
                <DynamicField
                  key={field.name}
                  field={field}
                  value={claimData[field.name] ?? ''}
                  onChange={v => handleClaimChange(field.name, v)}
                />
              ))}
            </div>
          </Card>
        )}

        {/* Step 4 — PIN */}
        {selectedSchema && (
          <Card className='p-6'>
            <StepHeader number={4} title='Confirm with your wallet PIN' active={currentStep >= 4} />
            <p className='mt-1 text-xs text-muted-foreground'>
              The PIN is used to decrypt your private key and sign the request.
            </p>
            <div className='mt-4 max-w-xs space-y-2'>
              <Label htmlFor='request-pin'>Wallet PIN</Label>
              <Input
                id='request-pin'
                type='password'
                inputMode='numeric'
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder='••••'
                required
              />
            </div>
          </Card>
        )}

        {submitError && (
          <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
            {submitError}
          </div>
        )}

        <div className='flex justify-end'>
          <Button type='submit' size='lg' disabled={!isFormValid || submitting}>
            <Send className='h-4 w-4' />
            {submitting ? 'Sending...' : 'Send request'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// -- Components --

function BackLink() {
  return (
    <Button variant='ghost' size='sm' asChild className='-ml-2'>
      <Link href='/wallet/credentials'>
        <ArrowLeft className='h-4 w-4' />
        Back to credentials
      </Link>
    </Button>
  );
}

function StepHeader({ number, title, active }: { number: number; title: string; active: boolean }) {
  return (
    <div className='flex items-center gap-3'>
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
          active ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'
        }`}
      >
        {number}
      </span>
      <h2 className='text-base font-semibold'>{title}</h2>
    </div>
  );
}

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === 'unsupported') {
    return (
      <div className='rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground'>
        <span className='font-medium'>{field.label}:</span> {field.unsupportedReason}
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      <Label htmlFor={field.name}>
        {field.label}
        {field.required && <span className='ml-0.5 text-destructive'>*</span>}
      </Label>
      <Input
        id={field.name}
        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={field.required}
        minLength={field.minLength}
        maxLength={field.maxLength}
        min={field.min}
        max={field.max}
      />
      {field.description && <p className='text-xs text-muted-foreground'>{field.description}</p>}
      {(field.minLength || field.maxLength) && field.type === 'text' && (
        <p className='text-xs text-muted-foreground'>
          {field.minLength === field.maxLength
            ? `Exactly ${field.minLength} characters`
            : `${field.minLength ?? 0}–${field.maxLength ?? '∞'} characters`}
        </p>
      )}
    </div>
  );
}

function cardButtonClass(isSelected: boolean): string {
  return [
    'rounded-xl border p-4 text-left transition-all',
    isSelected
      ? 'border-accent bg-accent/5 ring-2 ring-accent/30'
      : 'border-border hover:border-accent/40',
  ].join(' ');
}

function RequestSkeleton() {
  return (
    <div className='space-y-6'>
      <Skeleton className='h-8 w-40' />
      <Skeleton className='h-12 w-72' />
      <Skeleton className='h-32' />
      <Skeleton className='h-40' />
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
