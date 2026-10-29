import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl border border-[#27272a]/50 bg-[#18181b]/90',
        className,
      )}
      {...props}
    />
  );
}

