import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
    hideHeader?: boolean;
    padded?: boolean;
    scrollableBody?: boolean;
}

export function Dialog({
    isOpen,
    onClose,
    title,
    description,
    children,
    footer,
    maxWidth = 'lg',
    hideHeader = false,
    padded = true,
    scrollableBody = true
}: DialogProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
        '6xl': 'max-w-6xl',
        '7xl': 'max-w-7xl',
        full: 'max-w-full'
    };

    return createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            {/* Backdrop - Explicitly removed blur and ensured inset-0 */}
            <div
                className="fixed inset-0 bg-zinc-950/60 transition-opacity animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Content */}
            <div
                className={`relative w-full ${maxWidthClasses[maxWidth]} bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-300`}
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                {!hideHeader && (
                    <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-900/50 uppercase tracking-widest">
                        <div>
                            {title && <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{title}</h3>}
                            {description && <p className="text-sm text-zinc-500 mt-1">{description}</p>}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className={`${padded ? 'p-6' : ''} ${scrollableBody ? 'overflow-y-auto' : 'overflow-hidden'} max-h-[calc(100vh-200px)]`}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-6 border-t border-zinc-100 dark:border-zinc-900/50 bg-zinc-50/50 dark:bg-zinc-900/20 flex justify-end gap-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
