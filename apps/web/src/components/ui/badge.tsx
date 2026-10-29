import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:
          'border-emerald-500/25 bg-emerald-500/15 text-emerald-400',
        secondary:
          'border-[#27272a] bg-[#18181b] text-zinc-300',
        destructive:
          'border-red-500/30 bg-red-500/15 text-red-400',
        warning:
          'border-amber-500/30 bg-amber-500/15 text-amber-400',
        outline:
          'border-[#27272a] text-zinc-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

