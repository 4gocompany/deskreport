import { InputHTMLAttributes, forwardRef } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> { }

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className = '', ...props }, ref) => {
        return (
            <input
                type="checkbox"
                ref={ref}
                className={`h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:checked:bg-neutral-50 dark:checked:border-neutral-50 dark:focus:ring-neutral-50 ${className}`}
                {...props}
            />
        );
    }
);

Checkbox.displayName = 'Checkbox';
