import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  wrapperClassName?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, wrapperClassName, children, ...props }, ref) => (
    <div className={cn('relative inline-flex items-center', wrapperClassName)}>
      <select
        ref={ref}
        className={cn(
          'min-h-[44px] h-11 w-full appearance-none rounded-lg border border-[#27272a] bg-[#121215] pl-3.5 pr-9 py-2 text-xs font-medium text-zinc-100 shadow-sm transition-colors hover:border-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981]/40 focus-visible:border-[#10b981] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-zinc-400" />
    </div>
  ),
);
Select.displayName = 'Select';

export { Select };
