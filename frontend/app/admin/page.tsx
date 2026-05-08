'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, UserPlus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserMenu } from '@/components/wallet/user-menu';
import { isUnlocked } from '@/lib/wallet-lock';
import { getCurrentUser } from '@/lib/auth';
import api from '@/lib/api';

type RegisterType = 'issuer' | 'verifier';

export default function AdminPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [type, setType] = useState<RegisterType>('issuer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [country, setCountry] = useState('');
  const [lei, setLei] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isUnlocked()) {
      router.replace('/login?next=/admin');
      return;
    }
    getCurrentUser().then(user => {
      if (!user || user.role !== 'ADMIN') {
        router.replace('/login');
        return;
      }
      setChecked(true);
    });
  }, [router]);

  if (!checked) return <div className='min-h-screen bg-background' />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const endpoint = type === 'issuer' ? '/auth/register-issuer' : '/auth/register-verifier';
      await api.post(endpoint, { email, password, organizationName, country, lei });
      setSuccess(
        `${type === 'issuer' ? 'Issuer' : 'Verifier'} registered: ${email} (${organizationName})`,
      );
      setEmail('');
      setPassword('');
      setOrganizationName('');
      setCountry('');
      setLei('');
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Registration failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='min-h-screen bg-background'>
      <header className='flex h-16 items-center justify-between border-b border-border px-6'>
        <div className='flex items-center gap-2'>
          <Shield className='h-5 w-5 text-primary' />
          <span className='font-semibold'>Admin Panel</span>
        </div>
        <UserMenu />
      </header>

      <main className='mx-auto max-w-2xl px-6 py-10 space-y-8'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>User Management</h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            Register trusted Issuers and Verifiers in the system.
          </p>
        </div>

        <Card className='p-6'>
          <div className='mb-5 flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent'>
              <UserPlus className='h-5 w-5' />
            </div>
            <h2 className='font-semibold'>Register new user</h2>
          </div>

          {/* Type selector */}
          <div className='mb-5 flex gap-2'>
            {(['issuer', 'verifier'] as RegisterType[]).map(t => (
              <button
                key={t}
                type='button'
                onClick={() => setType(t)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-all ${
                  type === t
                    ? 'border-accent bg-accent/5 ring-2 ring-accent/30'
                    : 'border-border hover:border-accent/40'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='admin-email'>Email</Label>
              <Input
                id='admin-email'
                type='email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={`${type}@company.com`}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='admin-password'>Password</Label>
              <Input
                id='admin-password'
                type='password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder='Min. 6 characters'
                minLength={6}
                required
              />
            </div>

            {/* Organization fields — required for both issuer and verifier */}
            <>
              <div className='space-y-2'>
                <Label htmlFor='org-name'>Organization name</Label>
                <Input
                  id='org-name'
                  value={organizationName}
                  onChange={e => setOrganizationName(e.target.value)}
                  placeholder='e.g. National University'
                  required
                />
              </div>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='org-country'>Country</Label>
                  <Input
                    id='org-country'
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    placeholder='e.g. UA'
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='org-lei'>LEI</Label>
                  <Input
                    id='org-lei'
                    value={lei}
                    onChange={e => setLei(e.target.value)}
                    placeholder='20-character LEI'
                    minLength={20}
                    maxLength={20}
                    required
                  />
                </div>
              </div>
            </>

            {error && (
              <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
                {error}
              </div>
            )}
            {success && (
              <div className='rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700'>
                {success}
              </div>
            )}

            <div className='flex justify-end'>
              <Button
                type='submit'
                disabled={submitting || !organizationName || !country || lei.length !== 20}
              >
                {submitting ? 'Registering...' : `Register ${type}`}
              </Button>
            </div>
          </form>
        </Card>
      </main>
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
