'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Center, Loader, Stack, Text, ThemeIcon, Alert } from '@mantine/core';
import { IconCheck, IconAlertCircle, IconReceipt } from '@tabler/icons-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type CallbackStatus = 'processing' | 'success' | 'error';

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<CallbackStatus>('processing');
    const [message, setMessage] = useState('Memproses login...');

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get('code');
            const errorParam = searchParams.get('error');
            const errorDescription = searchParams.get('error_description');

            console.log('[AuthCallback] Processing...', { hasCode: !!code, error: errorParam });

            // Handle OAuth error from provider
            if (errorParam) {
                console.error('[AuthCallback] OAuth error:', errorParam, errorDescription);
                setStatus('error');
                setMessage(errorDescription || 'Login gagal. Silakan coba lagi.');
                setTimeout(() => router.push('/login?error=oauth'), 2000);
                return;
            }

            // No code provided
            if (!code) {
                console.error('[AuthCallback] No code provided');
                setStatus('error');
                setMessage('Kode otorisasi tidak ditemukan.');
                setTimeout(() => router.push('/login?error=oauth'), 2000);
                return;
            }

            try {
                // Exchange code for session using browser client
                // This sets cookies directly in the browser context
                const supabase = createSupabaseBrowserClient();
                const { error } = await supabase.auth.exchangeCodeForSession(code);

                if (error) {
                    console.error('[AuthCallback] Session exchange failed:', error.message);

                    // PKCE error fallback: check if user is already authenticated
                    // This can happen with stale cookies or overlapping login attempts
                    if (error.message.includes('PKCE') || error.message.includes('code verifier')) {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                            console.log('[AuthCallback] PKCE failed but user is authenticated, proceeding');
                            setStatus('success');
                            setMessage('Login berhasil! Mengalihkan...');
                            setTimeout(() => router.push('/'), 500);
                            return;
                        }
                    }

                    setStatus('error');
                    setMessage('Gagal membuat sesi. Silakan coba lagi.');
                    setTimeout(() => router.push('/login?error=oauth'), 2000);
                    return;
                }

                console.log('[AuthCallback] Session established successfully');
                setStatus('success');
                setMessage('Login berhasil! Mengalihkan...');

                // Small delay to show success state before redirect
                setTimeout(() => router.push('/'), 500);
            } catch (err) {
                console.error('[AuthCallback] Unexpected error:', err);
                setStatus('error');
                setMessage('Terjadi kesalahan tidak terduga.');
                setTimeout(() => router.push('/login?error=oauth'), 2000);
            }
        };

        handleCallback();
    }, [searchParams, router]);

    return (
        <Center mih="100dvh" bg="gray.0">
            <Stack align="center" gap="lg">
                {status === 'processing' && (
                    <>
                        <ThemeIcon size={60} radius="xl" variant="light" color="blue">
                            <Loader size="sm" color="blue" />
                        </ThemeIcon>
                        <Text c="dimmed">{message}</Text>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <ThemeIcon size={60} radius="xl" variant="light" color="green">
                            <IconCheck size={30} />
                        </ThemeIcon>
                        <Text c="green" fw={500}>{message}</Text>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <ThemeIcon size={60} radius="xl" variant="light" color="red">
                            <IconAlertCircle size={30} />
                        </ThemeIcon>
                        <Alert color="red" radius="md" icon={<IconAlertCircle size={16} />}>
                            {message}
                        </Alert>
                    </>
                )}
            </Stack>
        </Center>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense
            fallback={
                <Center mih="100dvh" bg="gray.0">
                    <Stack align="center" gap="md">
                        <ThemeIcon size={60} radius="xl" variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }}>
                            <IconReceipt size={30} />
                        </ThemeIcon>
                        <Loader size="sm" />
                    </Stack>
                </Center>
            }
        >
            <AuthCallbackContent />
        </Suspense>
    );
}
