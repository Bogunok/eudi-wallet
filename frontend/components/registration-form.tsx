'use client';

import { useState, useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Eye, EyeOff, Lock, Shield, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

export function RegistrationForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState(['', '', '', '']);
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await api.post('/auth/register', {
        email,
        password,
        pin: pin.join(''),
      });

      localStorage.setItem('savedEmail', email);
      router.push('/wallet');
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Error occurred. Try again'));
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = email && password.length >= 8 && pin.every(d => d !== '');

  return (
    <Card className='w-full max-w-md border-0 shadow-xl shadow-foreground/5'>
      <CardHeader className='space-y-3 pb-6'>
        <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary'>
          <Wallet className='h-7 w-7 text-primary-foreground' />
        </div>
        <div className='space-y-1.5 text-center'>
          <CardTitle className='text-2xl font-semibold tracking-tight'>
            Create your wallet
          </CardTitle>
          <CardDescription className='text-muted-foreground'>
            Set up your Enterprise EUDI Wallet securely
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className='space-y-5'>
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
            <Label htmlFor='password' className='text-sm font-medium text-foreground'>
              Password
            </Label>
            <div className='relative'>
              <Lock className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                id='password'
                type={showPassword ? 'text' : 'password'}
                placeholder='Min. 8 characters'
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
            <p className='text-xs text-muted-foreground'>Must be at least 8 characters long</p>
          </div>

          <div className='space-y-2'>
            <Label className='text-sm font-medium text-foreground flex items-center gap-2'>
              <Shield className='h-4 w-4 text-accent' />
              Wallet PIN
            </Label>
            <div className='flex justify-center gap-3' onPaste={handlePinPaste}>
              {pin.map((digit, index) => (
                <input
                  key={index}
                  ref={el => {
                    pinRefs.current[index] = el;
                  }}
                  type='text'
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
            <p className='text-xs text-muted-foreground text-center'>
              4-digit PIN for securing your wallet
            </p>
          </div>
          {error && (
            <div className='p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium text-center'>
              {error}
            </div>
          )}
          <Button
            type='submit'
            className='w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium'
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? (
              <div className='flex items-center gap-2'>
                <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground' />
                Creating wallet...
              </div>
            ) : (
              <div className='flex items-center gap-2'>
                <Wallet className='h-4 w-4' />
                Create Wallet
              </div>
            )}
          </Button>

          <p className='text-center text-sm text-muted-foreground'>
            Already have an account?{' '}
            <a
              href='/login'
              className='font-medium text-foreground hover:text-accent transition-colors underline underline-offset-4'
            >
              Sign in
            </a>
          </p>
        </form>
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
