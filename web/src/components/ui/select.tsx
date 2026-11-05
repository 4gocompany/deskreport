import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { }

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className = '', children, ...props }, ref) => {
        return (
            <select
                ref={ref}
                className={`flex h-9 w-full rounded-md border border-neutral-200 bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:focus-visible:ring-neutral-700 ${className}`}
                {...props}
            >
                {children}
            </select>
        );
    }
);

Select.displayName = 'Select';
