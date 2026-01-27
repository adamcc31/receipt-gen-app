'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, Button, Card, Center, Container, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconAlertCircle, IconBrandGoogle, IconReceipt } from '@tabler/icons-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginClient() {
    const params = useSearchParams();
    const [loading, setLoading] = useState(false);

    const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Receipt Management';

    const errorText = useMemo(() => {
        const error = params.get('error');
        if (error === 'unauthorized') return 'Email Anda tidak diizinkan untuk mengakses aplikasi ini.';
        if (error === 'oauth') return 'Login gagal. Silakan coba lagi.';
        return null;
    }, [params]);

    const signInWithGoogle = async () => {
        setLoading(true);
        const supabase = createSupabaseBrowserClient();
        const origin = window.location.origin;
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${origin}/auth/callback`,
            },
        });
        setLoading(false);
    };

    return (
        <Center mih="100dvh" style={{ background: '#F8FAFC' }}>
            <Container size="xs" py="xl" w="100%">
                <Stack gap="lg">
                    <Group gap="sm" justify="center">
                        <ThemeIcon size="xl" radius="md" variant="gradient" gradient={{ from: 'pink', to: 'pink' }}>
                            <IconReceipt size={22} />
                        </ThemeIcon>
                        <div>
                            <Title order={3} lh={1.1}>
                                {appName}
                            </Title>
                            <Text size="sm" c="dimmed">
                                Login hanya via Google (whitelist email).
                            </Text>
                        </div>
                    </Group>

                    {errorText ? (
                        <Alert icon={<IconAlertCircle size={16} />} color="red" radius="md">
                            {errorText}
                        </Alert>
                    ) : null}

                    <Card withBorder radius="md" padding="lg">
                        <Stack gap="sm">
                            <Button
                                leftSection={<IconBrandGoogle size={18} />}
                                onClick={signInWithGoogle}
                                loading={loading}
                                fullWidth
                            >
                                Login with Google
                            </Button>
                        </Stack>
                    </Card>
                </Stack>
            </Container>
        </Center>
    );
}
