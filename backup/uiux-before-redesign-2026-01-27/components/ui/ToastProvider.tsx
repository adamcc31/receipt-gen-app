'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Notification, Portal, Stack } from '@mantine/core';

export type ToastColor = 'blue' | 'green' | 'yellow' | 'red' | 'gray';

export type ToastInput = {
    title: string;
    message?: string;
    color?: ToastColor;
    autoCloseMs?: number;
};

type Toast = ToastInput & {
    id: string;
};

type ToastContextValue = {
    showToast: (toast: ToastInput) => string;
    dismissToast: (id: string) => void;
    dismissAll: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function createToastId() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({
    children,
    enabled = true,
}: {
    children: React.ReactNode;
    enabled?: boolean;
}) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timeoutsRef = useRef<Map<string, number>>(new Map());

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        const timeout = timeoutsRef.current.get(id);
        if (timeout !== undefined) {
            window.clearTimeout(timeout);
            timeoutsRef.current.delete(id);
        }
    }, []);

    const dismissAll = useCallback(() => {
        setToasts([]);
        for (const timeout of timeoutsRef.current.values()) {
            window.clearTimeout(timeout);
        }
        timeoutsRef.current.clear();
    }, []);

    const showToast = useCallback(
        (toast: ToastInput) => {
            if (!enabled) return '';
            const id = createToastId();
            const autoCloseMs = toast.autoCloseMs ?? 3500;
            const nextToast: Toast = {
                id,
                title: toast.title,
                message: toast.message,
                color: toast.color ?? 'blue',
                autoCloseMs,
            };

            setToasts((prev) => [nextToast, ...prev].slice(0, 5));

            if (autoCloseMs > 0) {
                const timeout = window.setTimeout(() => dismissToast(id), autoCloseMs);
                timeoutsRef.current.set(id, timeout);
            }

            return id;
        },
        [dismissToast, enabled]
    );

    useEffect(() => {
        const timeouts = timeoutsRef.current;
        return () => {
            for (const timeout of timeouts.values()) {
                window.clearTimeout(timeout);
            }
            timeouts.clear();
        };
    }, []);

    const value = useMemo<ToastContextValue>(
        () => ({ showToast, dismissToast, dismissAll }),
        [showToast, dismissToast, dismissAll]
    );

    return (
        <ToastContext.Provider value={value}>
            {children}
            {enabled ? (
                <Portal>
                    <Box
                        style={{
                            position: 'fixed',
                            top: 16,
                            right: 16,
                            zIndex: 10000,
                            width: 360,
                            maxWidth: 'calc(100vw - 32px)',
                            pointerEvents: 'none',
                        }}
                    >
                        <Stack gap="sm">
                            {toasts.map((toast) => (
                                <Box key={toast.id} style={{ pointerEvents: 'auto' }}>
                                    <Notification
                                        withBorder
                                        color={toast.color}
                                        title={toast.title}
                                        onClose={() => dismissToast(toast.id)}
                                    >
                                        {toast.message}
                                    </Notification>
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                </Portal>
            ) : null}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return ctx;
}
