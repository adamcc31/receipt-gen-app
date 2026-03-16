'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Center, Alert, Button, Stack, Text, ThemeIcon, Title, Container } from '@mantine/core';
import { IconAlertCircle, IconShieldOff, IconLogout } from '@tabler/icons-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface AccessGuardProps {
    children: ReactNode;
    userEmail: string | undefined;
    isAllowed: boolean;
}

/**
 * AccessGuard Component
 * Shows access denied UI if not whitelisted based on props passed from the server.
 */
export function AccessGuard({ children, userEmail, isAllowed }: AccessGuardProps) {
    const router = useRouter();
    const supabase = createSupabaseBrowserClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (!isAllowed) {
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
