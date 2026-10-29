import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative inline-flex items-center">
      <select
        ref={ref}
        className={cn(
          'h-9 w-full appearance-none rounded-lg border border-[#27272a] bg-[#121215] pl-3 pr-8 py-1.5 text-xs font-medium text-zinc-200 shadow-sm transition-colors hover:border-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981]/40 focus-visible:border-[#10b981] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-zinc-400" />
    </div>
  ),
);
Select.displayName = 'Select';

export { Select };

