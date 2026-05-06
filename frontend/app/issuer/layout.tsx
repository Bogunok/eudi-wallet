'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { IssuerSidebar } from '@/components/issuer/sidebar';
import { UserMenu } from '@/components/wallet/user-menu';
import { SetupPinBanner } from '@/components/issuer/setup-pin-banner';
import { isUnlocked } from '@/lib/wallet-lock';
import { getCurrentUser, defaultRouteForRole, type CurrentUser } from '@/lib/auth';

export default function IssuerLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    if (!isUnlocked()) {
      router.replace(`/login?next=${encodeURIComponent(pathname || '/issuer')}`);
      return;
    }

    getCurrentUser().then(u => {
      if (!u) {
        router.replace('/login');
        return;
      }
      if (u.role !== 'ISSUER') {
        router.replace(defaultRouteForRole(u.role));
        return;
      }
      setUser(u);
      setChecked(true);
    });
  }, [router, pathname]);

  if (!checked) return <div className='min-h-screen bg-background' />;

  return (
    <div className='flex min-h-screen bg-background'>
      <IssuerSidebar />
      <div className='flex min-w-0 flex-1 flex-col'>
        <header className='flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur'>
          <div className='lg:hidden'>
            <span className='font-semibold'>EUDI Wallet — Issuer</span>
          </div>
          <div className='hidden lg:block' />
          <UserMenu />
        </header>
        <main className='flex-1 overflow-y-auto px-6 py-8'>
          <div className='mx-auto max-w-5xl'>
            {/* PIN banner if not set */}
            {user && !user.hasPinSet && (
              <SetupPinBanner
                onPinSet={() => setUser(prev => (prev ? { ...prev, hasPinSet: true } : prev))}
              />
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
