'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    AppShell,
    Burger,
    Group,
    NavLink,
    Title,
    Text,
    Divider,
    ThemeIcon,
    Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    IconHome,
    IconUpload,
    IconList,
    IconSettings,
    IconReceipt,
} from '@tabler/icons-react';
import { GlobalSearchProvider } from '@/components/ui/GlobalSearch';
import { DashboardHeaderActions } from '@/components/dashboard/DashboardHeaderActions';
import { AccessGuard } from '@/components/auth/AccessGuard';

const navItems = [
    { label: 'Dashboard', href: '/', icon: IconHome },
    { label: 'Upload', href: '/upload', icon: IconUpload },
    { label: 'Batches', href: '/batches', icon: IconList },
    { label: 'Settings', href: '/settings', icon: IconSettings },
];

export default function DashboardLayoutClient({
    children,
}: {
    children: React.ReactNode;
}) {
    const [opened, { toggle }] = useDisclosure();
    const pathname = usePathname();

    return (
        <AccessGuard>
            <GlobalSearchProvider>
                <AppShell
                    header={{ height: 60 }}
                    navbar={{ width: 260, breakpoint: 'sm', collapsed: { mobile: !opened } }}
                    padding="md"
                    styles={{
                        main: { backgroundColor: 'var(--color-background)' },
                        navbar: {
                            backgroundColor: 'var(--color-sidebar-bg)',
                            borderRight: 'none',
                            color: 'var(--color-sidebar-text)'
                        },
                        header: {
                            backgroundColor: 'var(--color-surface)',
                            borderBottom: '1px solid #e2e8f0'
                        }
                    }}
                >
                    <AppShell.Header>
                        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
                            <Group wrap="nowrap">
                                <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                                <ThemeIcon
                                    size={32}
                                    radius="md"
                                    color="brand"
                                    variant="filled"
                                >
                                    <IconReceipt size={20} />
                                </ThemeIcon>
                                <Title order={4} c="var(--color-text-heading)">
                                    Exata Receipt Management System
                                </Title>
                            </Group>
                            <DashboardHeaderActions />
                        </Group>
                    </AppShell.Header>

                    <AppShell.Navbar p="md">
                        <Box mb="xl" px="xs">
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs" style={{ letterSpacing: '0.5px' }}>
                                Overview
                            </Text>
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <NavLink
                                        key={item.href}
                                        component={Link}
                                        href={item.href}
                                        label={
                                            <Text size="sm" fw={isActive ? 600 : 500}>
                                                {item.label}
                                            </Text>
                                        }
                                        leftSection={
                                            <item.icon
                                                size={20}
                                                stroke={1.5}
                                                color={isActive ? 'var(--color-primary)' : 'currentColor'}
                                            />
                                        }
                                        active={isActive}
                                        variant="filled"
                                        mb={4}
                                        color="brand"
                                        style={{
                                            borderRadius: '8px',
                                            backgroundColor: isActive ? 'var(--color-sidebar-active-bg)' : 'transparent',
                                            color: isActive ? 'var(--color-primary)' : 'var(--color-sidebar-text)',
                                        }}
                                        styles={{
                                            root: {
                                                '&:hover': {
                                                    backgroundColor: 'var(--color-primary-light)',
                                                    color: 'var(--color-primary)',
                                                }
                                            }
                                        }}
                                    />
                                );
                            })}
                        </Box>

                        <Divider my="md" color="rgba(255,255,255,0.1)" />

                        <Box mt="auto" px="xs">
                            <Text size="xs" c="dimmed">
                                v1.5.0
                            </Text>
                        </Box>
                    </AppShell.Navbar>

                    <AppShell.Main>{children}</AppShell.Main>
                </AppShell>
            </GlobalSearchProvider>
        </AccessGuard>
    );
}
