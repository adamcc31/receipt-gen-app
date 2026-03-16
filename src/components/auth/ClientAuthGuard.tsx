'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Center, Loader, Alert, Button, Text } from '@mantine/core';
import { IconAlertCircle, IconLogout } from '@tabler/icons-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { checkWhitelistStatus } from '@/app/actions/auth';

export default function ClientAuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const supabase = createSupabaseBrowserClient();
    
    const [isLoading, setIsLoading] = useState(true);
    const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function verifySessionAndWhitelist() {
            try {
                // 1. Resolve Auth directly from browser
                const { data: { user }, error } = await supabase.auth.getUser();

                if (error || !user) {
                    console.log('[ClientAuthGuard] Browser getUser failed or null', error?.message);
                    if (isMounted) router.push('/login');
                    return;
                }

                if (!user.email) {
                    console.error('[ClientAuthGuard] User has no email');
                    if (isMounted) {
                        setIsAllowed(false);
                        setIsLoading(false);
                    }
                    return;
                }

                setUserEmail(user.email);

                // 2. Validate against Database Whitelist using Server Action
                const allowed = await checkWhitelistStatus(user.email);
                
                if (isMounted) {
                    setIsAllowed(allowed);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('[ClientAuthGuard] Unexpected error during verification:', err);
                if (isMounted) {
                    setIsAllowed(false);
                    setIsLoading(false);
                }
            }
        }

        verifySessionAndWhitelist();

        return () => {
            isMounted = false;
        };
    }, [router, supabase.auth]);

    const handleLogout = async () => {
        setIsLoading(true);
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (isLoading) {
        return (
            <Center style={{ width: '100vw', height: '100vh', background: '#f5f5f5' }}>
                <Loader size="xl" variant="dots" color="blue" />
            </Center>
        );
    }

    if (isAllowed === false) {
        return (
            <Center style={{ width: '100vw', height: '100vh', padding: '1rem', background: '#f5f5f5' }}>
                <Alert
                    icon={<IconAlertCircle size={24} />}
                    title="Akses Ditolak"
                    color="red"
                    variant="filled"
                    styles={{
                        root: { maxWidth: 500, width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
                        title: { fontSize: '1.2rem', marginBottom: '0.5rem' },
                        message: { fontSize: '1rem' }
                    }}
                >
                    <div style={{ marginBottom: '1.5rem', lineHeight: 1.5 }}>
                        <Text component="span" fw={600}>{userEmail}</Text> belum terdaftar dalam sistem.
                        Silakan hubungi Administrator untuk mendaftarkan email Anda ke dalam Database (Tabel Whitelist).
                    </div>
                    <Button
                        variant="white"
                        color="red"
                        onClick={handleLogout}
                        fullWidth
                        leftSection={<IconLogout size={18} />}
                        size="md"
                    >
                        Keluar & Kembali ke Login
                    </Button>
                </Alert>
            </Center>
        );
    }

    return <>{children}</>;
}
