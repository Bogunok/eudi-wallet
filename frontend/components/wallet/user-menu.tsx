'use client';

import { useEffect, useState } from 'react';
import { LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentUser, logout, type CurrentUser } from '@/lib/auth';

export function UserMenu() {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let mounted = true;
    getCurrentUser().then(u => {
      if (mounted) setUser(u);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className='flex items-center gap-3'>
      <div className='hidden flex-col items-end text-xs leading-tight sm:flex'>
        <span className='font-medium text-foreground'>{user?.email ?? '...'}</span>
        <span className='text-muted-foreground'>{user?.role ?? ''}</span>
      </div>
      <div className='flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent'>
        <UserIcon className='h-4 w-4' />
      </div>
      <Button variant='ghost' size='sm' onClick={() => logout()} title='Sign out'>
        <LogOut className='h-4 w-4' />
        <span className='sr-only sm:not-sr-only'>Sign out</span>
      </Button>
    </div>
  );
}
