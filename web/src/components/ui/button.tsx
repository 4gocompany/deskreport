import { ButtonHTMLAttributes, forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export const buttonVariants = (variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className: string = '') => {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-bold transition-all focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]';

  const variants = {
    primary: 'bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200',
    secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700',
    outline: 'border border-zinc-200 bg-transparent hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900',
    ghost: 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
    danger: 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-900 dark:hover:bg-red-800',
  };

  const sizes = {
    sm: 'h-7 px-3 text-[11px]',
    md: 'h-8 px-4 text-[12px]',
    lg: 'h-10 px-6 text-sm',
    icon: 'h-8 w-8',
  };

  return `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonVariants(variant, size, className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
