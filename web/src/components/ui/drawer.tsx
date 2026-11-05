import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: string;
}

export function Drawer({
    isOpen,
    onClose,
    children,
    maxWidth = 'max-w-[1024px]'
}: DrawerProps) {
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

    if (!mounted) return null;

    return createPortal(
        <>
            {/* Dimmer Overlay - NO BLUR and ensured fixed inset-0 */}
            <div
                className={`fixed inset-0 bg-zinc-950/60 z-[998] transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Main Drawer Container */}
            <div
                className={`fixed right-0 top-0 h-full w-full ${maxWidth} bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 border-l border-zinc-200 dark:border-zinc-800 z-[999] transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0 slide-in-from-right' : 'translate-x-full'}`}
            >
                {children}
            </div>
        </>,
        document.body
    );
}
