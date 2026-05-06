'use client';

import { useEffect, useState } from 'react';
import { FileText, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';

interface Schema {
  id: string;
  name: string;
  schemaId: string;
  structure: Record<string, unknown>;
}

export default function IssuerSchemasPage() {
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [schemaId, setSchemaId] = useState('');
  const [structureText, setStructureText] = useState(
    JSON.stringify(
      {
        type: 'object',
        properties: {
          fieldName: { type: 'string' },
        },
        required: ['fieldName'],
        additionalProperties: false,
      },
      null,
      2,
    ),
  );
  const [structureError, setStructureError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    fetchSchemas();
  }, []);

  const fetchSchemas = async () => {
    try {
      const res = await api.get<Schema[]>('/schemas');
      setSchemas(res.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const validateStructure = (text: string): boolean => {
    try {
      JSON.parse(text);
      setStructureError('');
      return true;
    } catch {
      setStructureError('Invalid JSON format');
      return false;
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStructure(structureText)) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await api.post<{ schema: Schema }>('/schemas', {
        name,
        schemaId,
        structure: JSON.parse(structureText),
      });
      setSchemas(prev => [...prev, res.data.schema]);
      setShowForm(false);
      setName('');
      setSchemaId('');
      setStructureText(
        JSON.stringify(
          { type: 'object', properties: {}, required: [], additionalProperties: false },
          null,
          2,
        ),
      );
    } catch (err: unknown) {
      setSubmitError(extractErrorMessage(err, 'Failed to create schema'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <SchemasSkeleton />;

  return (
    <div className='space-y-6'>
      <div className='flex items-end justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Credential Schemas</h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            Define the structure of credentials your organization can issue.
          </p>
        </div>
        <Button onClick={() => setShowForm(v => !v)}>
          <Plus className='h-4 w-4' />
          New schema
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className='border-accent/20 p-6'>
          <h2 className='mb-4 font-semibold'>Create new schema</h2>
          <form onSubmit={handleCreate} className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='schema-name'>Schema name</Label>
                <Input
                  id='schema-name'
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder='e.g. Business License'
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='schema-id'>Schema ID</Label>
                <Input
                  id='schema-id'
                  value={schemaId}
                  onChange={e => setSchemaId(e.target.value)}
                  placeholder='e.g. custom:schema:license:v1'
                  required
                />
                <p className='text-xs text-muted-foreground'>Unique identifier for this schema</p>
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='structure'>JSON Schema structure</Label>
              <textarea
                id='structure'
                value={structureText}
                onChange={e => {
                  setStructureText(e.target.value);
                  setStructureError('');
                }}
                onBlur={() => validateStructure(structureText)}
                rows={12}
                className='w-full rounded-lg border border-border bg-input font-mono text-xs p-3 focus:outline-none focus:border-ring focus:ring-4 focus:ring-ring/20 resize-y'
                required
              />
              {structureError && <p className='text-xs text-destructive'>{structureError}</p>}
            </div>

            {submitError && (
              <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
                {submitError}
              </div>
            )}

            <div className='flex justify-end gap-3'>
              <Button type='button' variant='outline' onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type='submit' disabled={submitting}>
                {submitting ? 'Creating...' : 'Create schema'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* List */}
      {schemas.length === 0 ? (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center'>
          <div className='mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground'>
            <FileText className='h-6 w-6' />
          </div>
          <h3 className='font-semibold'>No schemas yet</h3>
          <p className='mt-1.5 text-sm text-muted-foreground'>
            Create your first credential schema to start issuing credentials.
          </p>
        </div>
      ) : (
        <div className='space-y-3'>
          {schemas.map(schema => (
            <SchemaCard key={schema.id} schema={schema} />
          ))}
        </div>
      )}
    </div>
  );
}

function SchemaCard({ schema }: { schema: Schema }) {
  const [expanded, setExpanded] = useState(false);

  const properties =
    (schema.structure as { properties?: Record<string, unknown> })?.properties ?? {};
  const fieldCount = Object.keys(properties).length;

  return (
    <Card className='overflow-hidden'>
      <div
        className='flex cursor-pointer items-start justify-between gap-4 p-5'
        onClick={() => setExpanded(v => !v)}
      >
        <div className='flex items-start gap-3 min-w-0'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent'>
            <FileText className='h-5 w-5' />
          </div>
          <div className='min-w-0'>
            <div className='font-semibold'>{schema.name}</div>
            <div className='mt-0.5 font-mono text-xs text-muted-foreground'>{schema.schemaId}</div>
            <div className='mt-1'>
              <Badge variant='secondary'>
                {fieldCount} field{fieldCount !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </div>
        <span className='shrink-0 text-muted-foreground'>
          {expanded ? <ChevronUp className='h-5 w-5' /> : <ChevronDown className='h-5 w-5' />}
        </span>
      </div>

      {expanded && (
        <div className='border-t border-border px-5 pb-5 pt-4'>
          <h3 className='mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            JSON Schema structure
          </h3>
          <pre className='overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed'>
            {JSON.stringify(schema.structure, null, 2)}
          </pre>
        </div>
      )}
    </Card>
  );
}

function SchemasSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='flex justify-between'>
        <div>
          <Skeleton className='h-7 w-48' />
          <Skeleton className='mt-2 h-4 w-64' />
        </div>
        <Skeleton className='h-10 w-32' />
      </div>
      <div className='space-y-3'>
        {[1, 2].map(i => (
          <Skeleton key={i} className='h-20' />
        ))}
      </div>
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
