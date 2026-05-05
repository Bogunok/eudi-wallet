'use client';

import { useState } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  KeyRound,
  AlertTriangle,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import api from '@/lib/api';
import { logout } from '@/lib/auth';
import { lock } from '@/lib/wallet-lock';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();

  // -- Change PIN --
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [pinWarningOpen, setPinWarningOpen] = useState(false);

  // -- Change Password --
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // -- Change Email --
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  // -- Reset Wallet --
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  // -- PIN handlers --

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess('');

    if (newPin !== confirmPin) {
      setPinError('New PINs do not match');
      return;
    }
    if (newPin.length !== 4) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }

    // Показуємо попередження перед відправкою.
    setPinWarningOpen(true);
  };

  const handlePinConfirmed = async () => {
    setPinWarningOpen(false);
    setPinLoading(true);

    try {
      await api.patch('/wallet/change-pin', { oldPin, newPin });
      setPinSuccess(
        'PIN changed successfully. All your private keys have been re-encrypted with the new PIN.',
      );
      setOldPin('');
      setNewPin('');
      setConfirmPin('');

      // Після зміни PIN — soft-lock гаманця, щоб юзер ввів новий PIN.
      lock();
      router.push('/login?next=/wallet/settings');
    } catch (err: unknown) {
      setPinError(extractErrorMessage(err, 'Failed to change PIN. Check your current PIN.'));
    } finally {
      setPinLoading(false);
    }
  };

  // -- Password handler --

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.patch('/user/password', { oldPassword, newPassword });
      setPasswordSuccess('Password changed successfully.');
      setOldPassword('');
      setNewPassword('');
    } catch (err: unknown) {
      setPasswordError(
        extractErrorMessage(err, 'Failed to change password. Check your current password.'),
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  // -- Email handler --

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');

    setEmailLoading(true);
    try {
      await api.patch('/user/email', { newEmail, password: emailPassword });
      localStorage.setItem('savedEmail', newEmail);
      setEmailSuccess(`Email changed to ${newEmail}. Please sign in again.`);
      setNewEmail('');
      setEmailPassword('');
      // Після зміни email — логаут для безпеки.
      setTimeout(() => logout(), 2000);
    } catch (err: unknown) {
      setEmailError(extractErrorMessage(err, 'Failed to change email. Check your password.'));
    } finally {
      setEmailLoading(false);
    }
  };

  // -- Reset wallet handler --

  const handleResetWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);

    try {
      await api.post('/auth/reset-account', {
        // email береться з cookies/сесії через бекенд
        // але наш ендпоінт вимагає email — потягнемо з getCurrentUser
        email: await getEmail(),
        password: resetPassword,
      });
      lock();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('savedEmail');
      }
      router.push('/register');
    } catch (err: unknown) {
      setResetError(extractErrorMessage(err, 'Failed to reset wallet. Check your password.'));
      setResetLoading(false);
    }
  };

  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Settings</h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          Manage your account security and preferences.
        </p>
      </div>

      {/* Change PIN */}
      <Card className='p-6'>
        <div className='mb-5 flex items-start gap-3'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent'>
            <KeyRound className='h-5 w-5' />
          </div>
          <div>
            <h2 className='font-semibold'>Change PIN</h2>
            <p className='mt-0.5 text-sm text-muted-foreground'>
              Update your 4-digit wallet PIN. All your decentralized identifiers (DIDs) will be
              automatically re-encrypted with the new PIN — they will remain fully valid.
            </p>
          </div>
        </div>

        <form onSubmit={handlePinSubmit} className='space-y-4'>
          <PinField id='old-pin' label='Current PIN' value={oldPin} onChange={setOldPin} />
          <PinField id='new-pin' label='New PIN' value={newPin} onChange={setNewPin} />
          <PinField
            id='confirm-pin'
            label='Confirm new PIN'
            value={confirmPin}
            onChange={setConfirmPin}
          />

          {pinError && <ErrorMessage message={pinError} />}
          {pinSuccess && <SuccessMessage message={pinSuccess} />}

          <div className='flex justify-end'>
            <Button type='submit' disabled={pinLoading || !oldPin || !newPin || !confirmPin}>
              {pinLoading ? 'Changing...' : 'Change PIN'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Change Password */}
      <Card className='p-6'>
        <div className='mb-5 flex items-start gap-3'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent'>
            <Lock className='h-5 w-5' />
          </div>
          <div>
            <h2 className='font-semibold'>Change Password</h2>
            <p className='mt-0.5 text-sm text-muted-foreground'>
              Update your account password. This does not affect your PIN or DIDs.
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className='space-y-4'>
          <PasswordField
            id='old-password'
            label='Current password'
            value={oldPassword}
            onChange={setOldPassword}
            show={showOldPassword}
            onToggle={() => setShowOldPassword(v => !v)}
          />
          <PasswordField
            id='new-password'
            label='New password'
            value={newPassword}
            onChange={setNewPassword}
            show={showNewPassword}
            onToggle={() => setShowNewPassword(v => !v)}
            minLength={8}
            hint='At least 8 characters'
          />

          {passwordError && <ErrorMessage message={passwordError} />}
          {passwordSuccess && <SuccessMessage message={passwordSuccess} />}

          <div className='flex justify-end'>
            <Button type='submit' disabled={passwordLoading || !oldPassword || !newPassword}>
              {passwordLoading ? 'Changing...' : 'Change password'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Change Email */}
      <Card className='p-6'>
        <div className='mb-5 flex items-start gap-3'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent'>
            <Mail className='h-5 w-5' />
          </div>
          <div>
            <h2 className='font-semibold'>Change Email</h2>
            <p className='mt-0.5 text-sm text-muted-foreground'>
              Update your account email. You will be signed out after the change.
            </p>
          </div>
        </div>

        <form onSubmit={handleEmailSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='new-email'>New email address</Label>
            <Input
              id='new-email'
              type='email'
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder='new@company.com'
              required
            />
          </div>
          <PasswordField
            id='email-password'
            label='Confirm with your password'
            value={emailPassword}
            onChange={setEmailPassword}
            show={showEmailPassword}
            onToggle={() => setShowEmailPassword(v => !v)}
          />

          {emailError && <ErrorMessage message={emailError} />}
          {emailSuccess && <SuccessMessage message={emailSuccess} />}

          <div className='flex justify-end'>
            <Button type='submit' disabled={emailLoading || !newEmail || !emailPassword}>
              {emailLoading ? 'Changing...' : 'Change email'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Danger Zone — Reset Wallet */}
      <Card className='border-destructive/20 p-6'>
        <div className='mb-5 flex items-start gap-3'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive'>
            <ShieldAlert className='h-5 w-5' />
          </div>
          <div>
            <h2 className='font-semibold text-destructive'>Danger zone</h2>
            <p className='mt-0.5 text-sm text-muted-foreground'>
              Permanently delete your wallet and all associated data. This action cannot be undone.
            </p>
          </div>
        </div>

        <Button
          variant='outline'
          className='border-destructive/40 text-destructive hover:bg-destructive/10'
          onClick={() => setResetDialogOpen(true)}
        >
          <Trash2 className='h-4 w-4' />
          Reset wallet
        </Button>
      </Card>

      {/* Dialog: PIN change warning */}
      <Dialog open={pinWarningOpen} onOpenChange={setPinWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <AlertTriangle className='h-5 w-5 text-amber-500' />
              Before you change your PIN
            </DialogTitle>
            <DialogDescription asChild>
              <div className='space-y-3 text-sm text-foreground'>
                <p>
                  Changing your PIN will trigger automatic re-encryption of all your private keys
                  (DIDs) with the new PIN. This is a secure operation and your DIDs will remain
                  valid.
                </p>
                <p className='text-muted-foreground'>
                  <strong>Important:</strong> Do not close the browser or disconnect during this
                  process. If it is interrupted, contact your administrator.
                </p>
                <p className='text-muted-foreground'>
                  After the PIN is changed, you will be redirected to the lock screen to confirm the
                  new PIN.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setPinWarningOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePinConfirmed} disabled={pinLoading}>
              {pinLoading ? 'Processing...' : 'Yes, change PIN'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Reset Wallet confirm */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset your wallet?</DialogTitle>
            <DialogDescription asChild>
              <div className='space-y-2 text-sm'>
                <p>This will permanently delete:</p>
                <ul className='ml-4 list-disc space-y-0.5 text-muted-foreground'>
                  <li>Your account</li>
                  <li>All verifiable credentials (VC)</li>
                  <li>All decentralized identifiers (DID)</li>
                  <li>Your organization profile</li>
                </ul>
                <p className='text-muted-foreground'>Enter your password to confirm.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetWallet} className='space-y-4'>
            <PasswordField
              id='reset-password'
              label='Password'
              value={resetPassword}
              onChange={setResetPassword}
              show={showResetPassword}
              onToggle={() => setShowResetPassword(v => !v)}
            />
            {resetError && <ErrorMessage message={resetError} />}
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setResetDialogOpen(false)}
                disabled={resetLoading}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                className='bg-red-600 text-white hover:bg-red-700'
                disabled={resetLoading || !resetPassword}
              >
                {resetLoading ? 'Deleting...' : 'Permanently delete'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -- Sub-components --

function PinField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className='max-w-xs space-y-2'>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type='password'
        inputMode='numeric'
        maxLength={4}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        placeholder='••••'
        required
      />
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  minLength,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  minLength?: number;
  hint?: string;
}) {
  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>{label}</Label>
      <div className='relative'>
        <Lock className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className='pl-10 pr-10'
          minLength={minLength}
          required
        />
        <button
          type='button'
          onClick={onToggle}
          className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
        >
          {show ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
        </button>
      </div>
      {hint && <p className='text-xs text-muted-foreground'>{hint}</p>}
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{message}</div>;
}

function SuccessMessage({ message }: { message: string }) {
  return (
    <div className='rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400'>
      {message}
    </div>
  );
}

// Отримуємо email поточного юзера для reset.
async function getEmail(): Promise<string> {
  const saved = typeof window !== 'undefined' ? localStorage.getItem('savedEmail') : null;
  if (saved) return saved;
  // Fallback: тягнемо з профілю
  try {
    const res = await api.get<{ data: { email: string } }>('/user');
    return res.data.data.email;
  } catch {
    return '';
  }
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
