'use client';

import { useState, useRef } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface SetupPinBannerProps {
  onPinSet: () => void;
}

export function SetupPinBanner({ onPinSet }: SetupPinBannerProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirm, setConfirm] = useState(['', '', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handlePinChange = (
    index: number,
    value: string,
    current: string[],
    setter: (v: string[]) => void,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    nextGroupRef?: React.MutableRefObject<(HTMLInputElement | null)[]>,
  ) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...current];
    next[index] = value.slice(-1);
    setter(next);
    if (value && index < 3) {
      refs.current[index + 1]?.focus();
    } else if (value && index === 3 && nextGroupRef) {
      nextGroupRef.current[0]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent,
    current: string[],
    setter: (v: string[]) => void,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
  ) => {
    if (e.key === 'Backspace' && !current[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const pinStr = pin.join('');
    const confirmStr = confirm.join('');

    if (pinStr.length !== 4) {
      setError('Enter a 4-digit PIN');
      return;
    }
    if (pinStr !== confirmStr) {
      setError('PINs do not match');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/set-pin', { pin: pinStr });
      onPinSet();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to set PIN. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isPinComplete = pin.every(d => d) && confirm.every(d => d);

  return (
    <div className='mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30'>
      <div className='flex items-start gap-3'>
        <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'>
          <KeyRound className='h-4 w-4' />
        </div>
        <div className='flex-1'>
          <p className='font-semibold text-amber-900 dark:text-amber-100'>Set up your wallet PIN</p>
          <p className='mt-0.5 text-sm text-amber-700 dark:text-amber-300'>
            Your PIN is required to sign and issue credentials. It encrypts your private key — keep
            it safe.
          </p>

          <form onSubmit={handleSubmit} className='mt-4 space-y-4'>
            <div className='space-y-2'>
              <Label className='text-amber-900 dark:text-amber-100 text-xs font-medium'>
                New PIN
              </Label>
              <div className='flex gap-2'>
                {pin.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => {
                      pinRefs.current[i] = el;
                    }}
                    type='password'
                    inputMode='numeric'
                    maxLength={1}
                    value={digit}
                    onChange={e =>
                      handlePinChange(i, e.target.value, pin, setPin, pinRefs, confirmRefs)
                    }
                    onKeyDown={e => handleKeyDown(i, e, pin, setPin, pinRefs)}
                    className={cn(
                      'h-12 w-12 rounded-lg border-2 bg-white text-center text-lg font-semibold',
                      'transition-all focus:outline-none focus:ring-2 focus:ring-amber-400',
                      digit ? 'border-amber-400' : 'border-amber-200',
                    )}
                    aria-label={`PIN digit ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className='space-y-2'>
              <Label className='text-amber-900 dark:text-amber-100 text-xs font-medium'>
                Confirm PIN
              </Label>
              <div className='flex gap-2'>
                {confirm.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => {
                      confirmRefs.current[i] = el;
                    }}
                    type='password'
                    inputMode='numeric'
                    maxLength={1}
                    value={digit}
                    onChange={e =>
                      handlePinChange(i, e.target.value, confirm, setConfirm, confirmRefs)
                    }
                    onKeyDown={e => handleKeyDown(i, e, confirm, setConfirm, confirmRefs)}
                    className={cn(
                      'h-12 w-12 rounded-lg border-2 bg-white text-center text-lg font-semibold',
                      'transition-all focus:outline-none focus:ring-2 focus:ring-amber-400',
                      digit ? 'border-amber-400' : 'border-amber-200',
                    )}
                    aria-label={`Confirm PIN digit ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {error && <p className='text-sm text-red-600'>{error}</p>}

            <Button
              type='submit'
              disabled={!isPinComplete || submitting}
              className='bg-amber-600 text-white hover:bg-amber-700'
            >
              {submitting ? 'Setting PIN...' : 'Set PIN'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
