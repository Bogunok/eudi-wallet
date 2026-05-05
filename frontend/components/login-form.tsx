'use client';

import { useState, useRef, type ChangeEvent, type KeyboardEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { getCurrentUser, defaultRouteForRole, resetAccount } from '@/lib/auth';
import { unlock } from '@/lib/wallet-lock';
import {
  Mail,
  Eye,
  EyeOff,
  Lock,
  Wallet,
  AlertCircle,
  ShieldAlert,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type FormMode = 'password' | 'pin' | 'locked' | 'reset-confirm';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');

  const [mode, setMode] = useState<FormMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState(['', '', '', '']);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setMode('pin');
    } else {
      setMode('password');
    }
  }, []);

  const redirectAfterLogin = async () => {
    if (nextParam && nextParam.startsWith('/')) {
      router.push(nextParam);
      return;
    }
    const user = await getCurrentUser();
    if (user) {
      router.push(defaultRouteForRole(user.role));
    } else {
      router.push('/wallet');
    }
  };

  // -- PIN handlers --

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    if (value && index < 3) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    const newPin = [...pin];
    for (let i = 0; i < pastedData.length; i++) {
      newPin[i] = pastedData[i];
    }
    setPin(newPin);
    if (pastedData.length > 0) {
      const focusIndex = Math.min(pastedData.length, 3);
      pinRefs.current[focusIndex]?.focus();
    }
  };

  // -- Submit handlers --

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await api.post('/auth/login', { email, password });
      localStorage.setItem('savedEmail', email);
      unlock();
      await redirectAfterLogin();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Invalid email or password'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await api.post('/auth/pin-login', { email, pin: pin.join('') });
      localStorage.setItem('savedEmail', email);
      unlock();
      setAttemptsLeft(3);
      await redirectAfterLogin();
    } catch (err: unknown) {
      const newAttempts = attemptsLeft - 1;
      setAttemptsLeft(newAttempts);
      setPin(['', '', '', '']);

      if (newAttempts <= 0) {
        setMode('locked');
        setAttemptsLeft(3);
        setError('');
      } else {
        const baseMessage = extractErrorMessage(err, 'Incorrect PIN');
        setError(`${baseMessage}. ${newAttempts} attempts left.`);
        pinRefs.current[0]?.focus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await resetAccount(email, resetPassword);
      router.push('/register');
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Invalid password. Please try again.'));
      setIsLoading(false);
    }
  };

  // -- Mode switchers --

  const switchToResetConfirm = () => {
    setMode('reset-confirm');
    setError('');
    setResetPassword('');
  };

  const cancelReset = () => {
    setMode('locked');
    setError('');
  };

  const switchToPasswordFromPin = () => {
    setMode('password');
    setPin(['', '', '', '']);
    setError('');
  };

  // -- Validation --

  const isPasswordFormValid = email && password.length >= 8;
  const isPinValid = pin.every(d => d !== '');
  const isResetValid = resetPassword.length >= 8;

  // -- Render --

  return (
    <Card className='w-full max-w-md border-0 shadow-xl shadow-foreground/5'>
      <CardHeader className='space-y-3 pb-6'>
        <div
          className={cn(
            'mx-auto flex h-14 w-14 items-center justify-center rounded-2xl',
            mode === 'locked' || mode === 'reset-confirm' ? 'bg-destructive' : 'bg-primary',
          )}
        >
          {mode === 'locked' || mode === 'reset-confirm' ? (
            <ShieldAlert className='h-7 w-7 text-destructive-foreground' />
          ) : (
            <Wallet className='h-7 w-7 text-primary-foreground' />
          )}
        </div>
        <div className='space-y-1.5 text-center'>
          {mode === 'pin' && (
            <>
              <CardTitle className='text-2xl font-semibold tracking-tight'>Welcome back</CardTitle>
              <CardDescription className='text-muted-foreground'>
                Enter your PIN to unlock your wallet
              </CardDescription>
            </>
          )}
          {mode === 'password' && (
            <>
              <CardTitle className='text-2xl font-semibold tracking-tight'>
                Sign in to your wallet
              </CardTitle>
              <CardDescription className='text-muted-foreground'>
                Access your Enterprise EUDI Wallet securely
              </CardDescription>
            </>
          )}
          {mode === 'locked' && (
            <>
              <CardTitle className='text-2xl font-semibold tracking-tight text-destructive'>
                Wallet locked
              </CardTitle>
              <CardDescription className='text-muted-foreground'>
                Too many incorrect PIN attempts
              </CardDescription>
            </>
          )}
          {mode === 'reset-confirm' && (
            <>
              <CardTitle className='text-2xl font-semibold tracking-tight'>
                Reset your wallet
              </CardTitle>
              <CardDescription className='text-muted-foreground'>
                This action is irreversible
              </CardDescription>
            </>
          )}
          {error && (
            <div className='mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md text-center'>
              {error}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* MODE: PIN */}
        {mode === 'pin' && (
          <form onSubmit={handlePinUnlock} className='space-y-5'>
            <div className='flex flex-col items-center gap-3 pb-2'>
              <div className='flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 border-2 border-accent/20 uppercase'>
                <span className='text-2xl font-semibold text-accent'>
                  {email ? email.charAt(0) : 'W'}
                </span>
              </div>
              <p className='text-sm text-muted-foreground'>{email}</p>
            </div>

            <div className='space-y-2'>
              <div className='flex justify-center gap-3' onPaste={handlePinPaste}>
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => {
                      pinRefs.current[index] = el;
                    }}
                    type='password'
                    inputMode='numeric'
                    maxLength={1}
                    value={digit}
                    onChange={e => handlePinChange(index, e.target.value)}
                    onKeyDown={e => handlePinKeyDown(index, e)}
                    className={cn(
                      'h-14 w-14 rounded-xl border-2 bg-input text-center text-xl font-semibold',
                      'transition-all duration-200',
                      'focus:border-ring focus:ring-4 focus:ring-ring/20 focus:outline-none',
                      digit ? 'border-accent bg-accent/5' : 'border-border',
                    )}
                    aria-label={`PIN digit ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className='flex items-center justify-center gap-2 text-sm'>
              <AlertCircle
                className={cn(
                  'h-4 w-4',
                  attemptsLeft <= 1 ? 'text-destructive' : 'text-muted-foreground',
                )}
              />
              <span
                className={cn(attemptsLeft <= 1 ? 'text-destructive' : 'text-muted-foreground')}
              >
                Attempts left: {attemptsLeft}
              </span>
            </div>

            <Button
              type='submit'
              className='w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium'
              disabled={!isPinValid || isLoading}
            >
              {isLoading ? (
                <div className='flex items-center gap-2'>
                  <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground' />
                  Unlocking...
                </div>
              ) : (
                <div className='flex items-center gap-2'>
                  <Lock className='h-4 w-4' />
                  Unlock Wallet
                </div>
              )}
            </Button>
          </form>
        )}

        {/* MODE: PASSWORD */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} className='space-y-5'>
            <div className='space-y-2'>
              <Label htmlFor='email' className='text-sm font-medium text-foreground'>
                Email address
              </Label>
              <div className='relative'>
                <Mail className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  id='email'
                  type='email'
                  placeholder='name@company.com'
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  className='h-11 pl-10 bg-input border-border focus:border-ring focus:ring-ring/20'
                  required
                />
              </div>
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='password' className='text-sm font-medium text-foreground'>
                  Password
                </Label>
              </div>
              <div className='relative'>
                <Lock className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  id='password'
                  type={showPassword ? 'text' : 'password'}
                  placeholder='Enter your password'
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  className='h-11 pl-10 pr-10 bg-input border-border focus:border-ring focus:ring-ring/20'
                  minLength={8}
                  required
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                </button>
              </div>
            </div>

            <Button
              type='submit'
              className='w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium'
              disabled={!isPasswordFormValid || isLoading}
            >
              {isLoading ? (
                <div className='flex items-center gap-2'>
                  <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground' />
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </Button>

            <p className='text-center text-sm text-muted-foreground'>
              {"Don't have an account?"}{' '}
              <a
                href='/register'
                className='font-medium text-foreground hover:text-accent transition-colors underline underline-offset-4'
              >
                Create wallet
              </a>
            </p>
          </form>
        )}

        {/* MODE: LOCKED */}
        {mode === 'locked' && (
          <div className='space-y-5'>
            <div className='rounded-lg bg-destructive/5 border border-destructive/20 p-4 text-sm text-foreground'>
              <p className='font-medium'>Your wallet is locked for security reasons.</p>
              <p className='mt-2 text-muted-foreground'>
                According to the EUDI standard, the PIN code cannot be recovered. To regain access,
                you must reset your wallet — this will permanently delete your account, all DIDs,
                credentials and organization data.
              </p>
            </div>

            <Button
              type='button'
              onClick={switchToResetConfirm}
              className='mx-auto flex w-fit items-center h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium'
            >
              <Trash2 className='h-4 w-4' />
              Reset wallet
            </Button>

            <button
              type='button'
              onClick={() => router.push('/')}
              className='w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors'
            >
              Cancel
            </button>
          </div>
        )}

        {/* MODE: RESET CONFIRM */}
        {mode === 'reset-confirm' && (
          <form onSubmit={handleResetConfirm} className='space-y-5'>
            <div className='rounded-lg bg-destructive/5 border border-destructive/20 p-4 text-sm'>
              <p className='font-medium text-destructive'>This will permanently delete:</p>
              <ul className='mt-2 ml-4 list-disc space-y-0.5 text-muted-foreground'>
                <li>Your account ({email})</li>
                <li>All issued credentials (VC)</li>
                <li>Your decentralized identifiers (DID)</li>
                <li>Your organization profile</li>
              </ul>
              <p className='mt-2 text-muted-foreground'>Enter your password to confirm.</p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='reset-password' className='text-sm font-medium'>
                Password
              </Label>
              <div className='relative'>
                <Lock className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  id='reset-password'
                  type={showResetPassword ? 'text' : 'password'}
                  placeholder='Enter your password'
                  value={resetPassword}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setResetPassword(e.target.value)}
                  className='h-11 pl-10 pr-10 bg-input border-border focus:border-ring focus:ring-ring/20'
                  minLength={8}
                  required
                  autoFocus
                />
                <button
                  type='button'
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                  aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                >
                  {showResetPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                </button>
              </div>
            </div>

            <Button
              type='submit'
              variant='destructive'
              className='w-full h-11 font-medium'
              disabled={!isResetValid || isLoading}
            >
              {isLoading ? (
                <div className='flex items-center gap-2'>
                  <div className='h-4 w-4 animate-spin rounded-full border-2 border-destructive-foreground/30 border-t-destructive-foreground' />
                  Resetting...
                </div>
              ) : (
                <>
                  <Trash2 className='h-4 w-4' />
                  Permanently delete wallet
                </>
              )}
            </Button>

            <button
              type='button'
              onClick={cancelReset}
              className='flex items-center justify-center gap-1 w-full text-sm text-muted-foreground hover:text-foreground transition-colors'
              disabled={isLoading}
            >
              <ArrowLeft className='h-3 w-3' />
              Back
            </button>
          </form>
        )}
      </CardContent>
    </Card>
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
