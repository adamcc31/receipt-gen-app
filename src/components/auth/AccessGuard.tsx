'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Center, Alert, Button, Stack, Loader, Text, ThemeIcon, Title, Container } from '@mantine/core';
import { IconAlertCircle, IconShieldOff, IconLogout } from '@tabler/icons-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type AccessStatus = 'loading' | 'allowed' | 'denied' | 'unauthenticated';

interface AccessGuardProps {
    children: ReactNode;
}

/**
 * AccessGuard Component
 * Checks if the current user's email is in the allowed_emails table.
 * Shows access denied UI if not whitelisted.
 */
export function AccessGuard({ children }: AccessGuardProps) {
    const [status, setStatus] = useState<AccessStatus>('loading');
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createSupabaseBrowserClient();

    useEffect(() => {
        async function checkAccess() {
            try {
                // Get current user
                const { data: { user }, error: userError } = await supabase.auth.getUser();

                console.log('[AccessGuard] User check:', {
                    hasUser: !!user,
                    email: user?.email,
                    userError: userError?.message
                });

                if (userError || !user) {
                    console.log('[AccessGuard] No authenticated user, redirecting to login');
                    setStatus('unauthenticated');
                    router.push('/login');
                    return;
                }

                setUserEmail(user.email ?? null);

                // Check if user email is in whitelist
                console.log('[AccessGuard] Checking whitelist for:', user.email);

                const { data: whitelistEntry, error: whitelistError } = await supabase
                    .from('allowed_emails')
                    .select('email')
                    .eq('email', user.email)
                    .single();

                console.log('[AccessGuard] Whitelist query result:', {
                    whitelistEntry,
                    whitelistError: whitelistError?.message,
                    errorCode: whitelistError?.code,
                });

                if (whitelistError || !whitelistEntry) {
                    console.log('[AccessGuard] User not in whitelist:', user.email);
                    setStatus('denied');
                    return;
                }

                console.log('[AccessGuard] User allowed:', user.email);
                setStatus('allowed');
            } catch (error) {
                console.error('[AccessGuard] Error checking access:', error);
                setStatus('denied');
            }
        }

        checkAccess();
    }, [supabase, router]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (status === 'loading' || status === 'unauthenticated') {
        return (
            <Center mih="100dvh" bg="gray.0">
                <Stack align="center" gap="md">
                    <Loader size="lg" />
                    <Text c="dimmed">Memverifikasi akses...</Text>
                </Stack>
            </Center>
        );
    }

    if (status === 'denied') {
        return (
            <Center mih="100dvh" bg="gray.0">
                <Container size="xs">
                    <Stack align="center" gap="lg">
                        <ThemeIcon size={80} radius="xl" color="red" variant="light">
                            <IconShieldOff size={40} />
                        </ThemeIcon>

                        <Stack align="center" gap="xs">
                            <Title order={2} ta="center">
                                Akses Ditolak
                            </Title>
                            <Text c="dimmed" ta="center" size="sm">
                                Email <strong>{userEmail}</strong> tidak terdaftar dalam daftar pengguna yang diizinkan.
                            </Text>
                        </Stack>

                        <Alert
                            icon={<IconAlertCircle size={16} />}
                            color="red"
                            radius="md"
                            title="Tidak Diizinkan"
                            w="100%"
                        >
                            Hubungi administrator untuk mendapatkan akses ke aplikasi ini.
                        </Alert>

                        <Button
                            leftSection={<IconLogout size={18} />}
                            variant="light"
                            color="gray"
                            onClick={handleSignOut}
                        >
                            Keluar dan Ganti Akun
                        </Button>
                    </Stack>
                </Container>
            </Center>
        );
    }

    return <>{children}</>;
}
