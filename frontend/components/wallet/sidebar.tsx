'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet, FileBadge, Building2, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/wallet', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/wallet/credentials', label: 'Credentials', icon: FileBadge },
  { href: '/wallet/organization', label: 'Organization', icon: Building2 },
  // TODO:Notifications, Settings
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className='hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col'>
      <div className='flex h-16 items-center gap-2 border-b border-sidebar-border px-6'>
        <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary'>
          <Wallet className='h-4 w-4 text-primary-foreground' />
        </div>
        <span className='font-semibold text-sidebar-foreground'>EUDI Wallet</span>
      </div>

      <nav className='flex-1 space-y-1 p-3'>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
              )}
            >
              <Icon className='h-4 w-4' />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className='border-t border-sidebar-border p-3 text-xs text-muted-foreground'>
        <p className='px-3 leading-5'>Diploma project · EUDI Wallet for Legal Entities</p>
      </div>
    </aside>
  );
}
