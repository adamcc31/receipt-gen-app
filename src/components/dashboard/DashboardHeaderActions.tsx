'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ActionIcon,
    Avatar,
    Badge,
    Box,
    Group,
    Indicator,
    Menu,
    Text,
    TextInput,
    UnstyledButton,
} from '@mantine/core';
import {
    IconBell,
    IconChevronDown,
    IconLogout,
    IconSearch,
} from '@tabler/icons-react';
import { uiFlags } from '@/lib/uiFlags';
import { useGlobalSearch } from '@/components/ui/GlobalSearch';
import { useToast } from '@/components/ui/ToastProvider';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function DashboardHeaderActions() {
    const { query, setQuery, clear } = useGlobalSearch();
    const { showToast } = useToast();
    const router = useRouter();
    const [unreadCount] = useState(3);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        const supabase = createSupabaseBrowserClient();

        const load = async () => {
            const { data } = await supabase.auth.getUser();
            setUserEmail(data.user?.email ?? null);
        };

        load();

        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserEmail(session?.user?.email ?? null);
        });

        return () => {
            data.subscription.unsubscribe();
        };
    }, []);

    const initials = useMemo(() => {
        const seed = userEmail?.trim() || 'U';
        return seed.slice(0, 1).toUpperCase();
    }, [userEmail]);

    const roleLabel = useMemo(() => (userEmail ? 'Allowed User' : 'Not Signed In'), [userEmail]);

    const logout = async () => {
        setLoggingOut(true);
        try {
            const supabase = createSupabaseBrowserClient();
            await supabase.auth.signOut();
        } finally {
            router.replace('/login');
            router.refresh();
            setLoggingOut(false);
        }
    };

    return (
        <Group gap="sm" wrap="nowrap">
            {uiFlags.headerSearch ? (
                <TextInput
                    value={query}
                    onChange={(e) => setQuery(e.currentTarget.value)}
                    placeholder="Search client, batch, or file name"
                    leftSection={<IconSearch size={16} />}
                    rightSection={
                        query ? (
                            <ActionIcon variant="subtle" color="gray" onClick={clear}>
                                <Text size="sm" fw={600}>
                                    ×
                                </Text>
                            </ActionIcon>
                        ) : null
                    }
                    size="sm"
                    w={320}
                    visibleFrom="sm"
                />
            ) : null}

            {uiFlags.headerNotifications ? (
                <Indicator
                    disabled={unreadCount <= 0}
                    color="red"
                    size={16}
                    label={unreadCount > 9 ? '9+' : unreadCount}
                    offset={6}
                    withBorder
                >
                    <ActionIcon
                        variant="subtle"
                        color="gray"
                        onClick={() => showToast({ title: 'Notifications', message: 'No notification source is connected yet.', color: 'gray' })}
                    >
                        <IconBell size={18} />
                    </ActionIcon>
                </Indicator>
            ) : null}

            {uiFlags.headerUserMenu ? (
                <Menu width={220} position="bottom-end" withinPortal>
                    <Menu.Target>
                        <UnstyledButton component="div" role="button" tabIndex={0}>
                            <Group gap="sm" wrap="nowrap">
                                <Avatar radius="xl" size={32}>
                                    {initials}
                                </Avatar>
                                <Box visibleFrom="sm">
                                    <Text size="sm" fw={600} lh={1.1}>
                                        {userEmail ?? 'Account'}
                                    </Text>
                                    <Badge size="xs" variant="light" color="blue">
                                        {roleLabel}
                                    </Badge>
                                </Box>
                                <Box visibleFrom="sm" c="dimmed">
                                    <IconChevronDown size={16} />
                                </Box>
                            </Group>
                        </UnstyledButton>
                    </Menu.Target>
                    <Menu.Dropdown>
                        {userEmail ? <Menu.Label>{userEmail}</Menu.Label> : null}
                        <Menu.Item
                            color="red"
                            leftSection={<IconLogout size={16} />}
                            onClick={logout}
                            disabled={loggingOut}
                        >
                            Logout
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            ) : null}
        </Group>
    );
}
