import { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger';
}

export function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
    const baseStyles = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2';

    const variants = {
        default: 'border-transparent bg-neutral-900 text-neutral-50 hover:bg-neutral-900/80 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-50/80',
        secondary: 'border-transparent bg-neutral-100 text-neutral-900 hover:bg-neutral-100/80 dark:bg-neutral-800 dark:text-neutral-50 dark:hover:bg-neutral-800/80',
        outline: 'text-neutral-900 dark:text-neutral-50 border-neutral-200 dark:border-neutral-800',
        success: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-50',
        warning: 'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-50',
        danger: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-50',
    };

    return (
        <div className={`${baseStyles} ${variants[variant]} ${className}`} {...props} />
    );
}
