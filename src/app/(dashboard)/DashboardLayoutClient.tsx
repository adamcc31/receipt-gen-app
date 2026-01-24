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
                >
                    <AppShell.Header>
                        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
                            <Group wrap="nowrap">
                                <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                                <ThemeIcon size="lg" radius="md" variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }}>
                                    <IconReceipt size={20} />
                                </ThemeIcon>
                                <Title order={4} c="dark">
                                    EXATA INDONESIA RECEIPT MANAGEMENT
                                </Title>
                            </Group>
                            <DashboardHeaderActions />
                        </Group>
                    </AppShell.Header>

                    <AppShell.Navbar p="md">
                        <Box mb="md">
                            <Text size="xs" fw={500} c="dimmed" tt="uppercase" mb="xs">
                                Main Menu
                            </Text>
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.href}
                                    component={Link}
                                    href={item.href}
                                    label={item.label}
                                    leftSection={<item.icon size={18} stroke={1.5} />}
                                    active={pathname === item.href}
                                    variant="filled"
                                    mb={4}
                                    style={{ borderRadius: '8px' }}
                                />
                            ))}
                        </Box>

                        <Divider my="md" />

                        <Box mt="auto">
                            <Text size="xs" c="dimmed" ta="center">
                                Version 1.5.0 <br />
                                Build by Noxx Labs (Adam Zibran)<br />
                                Last Update: 24 Jan 2026
                            </Text>
                        </Box>
                    </AppShell.Navbar>

                    <AppShell.Main bg="gray.0">{children}</AppShell.Main>
                </AppShell>
            </GlobalSearchProvider>
        </AccessGuard>
    );
}
