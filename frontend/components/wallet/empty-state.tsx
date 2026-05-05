import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; href: string };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center',
        className,
      )}
    >
      <div className='mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground'>
        {icon}
      </div>
      <h3 className='font-semibold text-foreground'>{title}</h3>
      <p className='mt-1.5 max-w-sm text-sm text-muted-foreground'>{description}</p>
      {action && (
        <Button className='mt-6' asChild>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
