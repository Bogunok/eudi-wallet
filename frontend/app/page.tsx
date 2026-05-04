import Link from 'next/link';
import { Wallet, ShieldCheck, FileBadge, ScanFace } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className='min-h-screen bg-gradient-to-b from-background to-muted/30'>
      {/* Header */}
      <header className='border-b border-border/40 bg-background/60 backdrop-blur'>
        <div className='mx-auto flex h-16 max-w-6xl items-center justify-between px-6'>
          <div className='flex items-center gap-2'>
            <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-primary'>
              <Wallet className='h-5 w-5 text-primary-foreground' />
            </div>
            <span className='font-semibold tracking-tight'>EUDI Wallet</span>
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='ghost' asChild>
              <Link href='/login'>Sign in</Link>
            </Button>
            <Button asChild>
              <Link href='/register'>Create wallet</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className='mx-auto max-w-6xl px-6 py-20'>
        <section className='mx-auto max-w-3xl text-center'>
          <div className='mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground'>
            <span className='h-1.5 w-1.5 rounded-full bg-emerald-500' />
            Compliant with EU Digital Identity standard
          </div>
          <h1 className='text-balance text-4xl font-semibold tracking-tight sm:text-5xl'>
            EUDI Wallet for Legal Entities
          </h1>
          <p className='mt-5 text-pretty text-lg text-muted-foreground'>
            Securely store your Legal Entity Identifier (LEI) and verifiable credentials. Issue,
            present and verify trusted organizational data — backed by Decentralized Identifiers and
            the European Blockchain Services Infrastructure.
          </p>
          <div className='mt-8 flex flex-wrap items-center justify-center gap-3'>
            <Button size='lg' asChild>
              <Link href='/register'>Get started</Link>
            </Button>
            <Button size='lg' variant='outline' asChild>
              <Link href='/login'>I already have a wallet</Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className='mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          <FeatureCard
            icon={<FileBadge className='h-5 w-5' />}
            title='Verifiable Credentials'
            description='Store and manage organizational credentials (LEI, certifications) issued by trusted authorities.'
          />
          <FeatureCard
            icon={<ShieldCheck className='h-5 w-5' />}
            title='Decentralized Identity'
            description='Your DID is anchored to the EBSI network. Private keys are encrypted and never leave the wallet.'
          />
          <FeatureCard
            icon={<ScanFace className='h-5 w-5' />}
            title='Selective Disclosure'
            description='Share only the claims a verifier asks for. Nothing more — privacy by design.'
          />
        </section>
      </main>

      <footer className='border-t border-border/40 py-8 text-center text-xs text-muted-foreground'>
        Diploma project · Implementation according to the EU Digital Identity Wallet standard
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className='rounded-2xl border border-border bg-card p-6 shadow-sm shadow-foreground/5'>
      <div className='mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary'>
        {icon}
      </div>
      <h3 className='font-semibold'>{title}</h3>
      <p className='mt-2 text-sm leading-6 text-muted-foreground'>{description}</p>
    </div>
  );
}
