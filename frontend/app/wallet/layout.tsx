'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/wallet/sidebar';
import { UserMenu } from '@/components/wallet/user-menu';
import { isUnlocked } from '@/lib/wallet-lock';

export default function WalletLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isUnlocked()) {
      const next = pathname || '/wallet';
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    setChecked(true);
  }, [router, pathname]);

  if (!checked) {
    return <div className='min-h-screen bg-background' />;
  }

  return (
    <div className='flex min-h-screen bg-background'>
      <Sidebar />
      <div className='flex min-w-0 flex-1 flex-col'>
        {/* Top bar */}
        <header className='flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur'>
          <div className='lg:hidden'>
            <span className='font-semibold'>EUDI Wallet</span>
          </div>
          <div className='hidden lg:block' />
          <UserMenu />
        </header>

        {/* Page content */}
        <main className='flex-1 overflow-y-auto px-6 py-8'>
          <div className='mx-auto max-w-5xl'>{children}</div>
        </main>
      </div>
    </div>
  );
}
