import { RegistrationForm } from '@/components/registration-form';
import { Shield } from 'lucide-react';

export default function RegistrationPage() {
  return (
    <main className='relative min-h-screen flex items-center justify-center p-4 overflow-hidden'>
      {/* Subtle background pattern */}
      <div className='absolute inset-0 -z-10'>
        <div className='absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]' />
        <div className='absolute top-0 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl' />
        <div className='absolute bottom-0 right-1/4 w-96 h-96 bg-muted rounded-full blur-3xl' />
      </div>

      {/* Header */}
      <header className='absolute top-0 left-0 right-0 p-6 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary'>
            <Shield className='h-5 w-5 text-primary-foreground' />
          </div>
          <span className='font-semibold text-foreground tracking-tight'>EUDI Wallet</span>
        </div>
      </header>

      {/* Registration Card */}
      <RegistrationForm />
    </main>
  );
}
