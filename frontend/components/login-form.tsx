'use client';

import { useState, useRef, type ChangeEvent, type KeyboardEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { getCurrentUser, defaultRouteForRole } from '@/lib/auth';
import { Mail, Eye, EyeOff, Lock, Wallet, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');

  const [isDeviceRecognized, setIsDeviceRecognized] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState(['', '', '', '']);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setIsDeviceRecognized(true);
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

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await api.post('/auth/login', { email, password });

      localStorage.setItem('savedEmail', email);

      await redirectAfterLogin();
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Invalid email or password');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await api.post('/auth/pin-login', {
        email,
        pin: pin.join(''),
      });

      localStorage.setItem('savedEmail', email);
      setAttemptsLeft(3);

      await redirectAfterLogin();
    } catch (err: unknown) {
      const newAttempts = attemptsLeft - 1;
      setAttemptsLeft(newAttempts);
      setPin(['', '', '', '']);
      pinRefs.current[0]?.focus();

      if (newAttempts <= 0) {
        localStorage.removeItem('savedEmail');
        setIsDeviceRecognized(false);
        setAttemptsLeft(3);
        setError('Too many failed attempts. Please sign in with your password.');
      } else {
        const baseMessage = extractErrorMessage(err, 'Incorrect PIN');
        setError(`${baseMessage}. ${newAttempts} attempts left.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchToPasswordLogin = () => {
    setIsDeviceRecognized(false);
    setPin(['', '', '', '']);
    setError('');
  };

  const isPasswordFormValid = email && password.length >= 8;
  const isPinValid = pin.every(d => d !== '');

  return (
    <Card className='w-full max-w-md border-0 shadow-xl shadow-foreground/5'>
      <CardHeader className='space-y-3 pb-6'>
        <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary'>
          <Wallet className='h-7 w-7 text-primary-foreground' />
        </div>
        <div className='space-y-1.5 text-center'>
          {isDeviceRecognized ? (
            <>
              <CardTitle className='text-2xl font-semibold tracking-tight'>Welcome back</CardTitle>
              <CardDescription className='text-muted-foreground'>
                Enter your PIN to unlock your wallet
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle className='text-2xl font-semibold tracking-tight'>
                Sign in to your wallet
              </CardTitle>
              <CardDescription className='text-muted-foreground'>
                Access your Enterprise EUDI Wallet securely
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
        {isDeviceRecognized ? (
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

            <p className='text-center text-sm text-muted-foreground'>
              Not you?{' '}
              <button
                type='button'
                onClick={switchToPasswordLogin}
                className='font-medium text-foreground hover:text-accent transition-colors underline underline-offset-4'
              >
                Sign in with password
              </button>
            </p>
          </form>
        ) : (
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
                <a
                  href='#'
                  className='text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4'
                >
                  Forgot password?
                </a>
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
