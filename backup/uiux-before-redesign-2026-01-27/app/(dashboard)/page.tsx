'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Container,
    Title,
    Text,
    Grid,
    Card,
    Group,
    ThemeIcon,
    Stack,
    Badge,
    Button,
    Skeleton,
    UnstyledButton,
    Box,
} from '@mantine/core';
import {
    IconUpload,
    IconFileSpreadsheet,
    IconReceipt,
    IconCheck,
    IconClock,
    IconArrowRight,
    IconChartBar,
} from '@tabler/icons-react';
import Link from 'next/link';
import { StatCardSkeleton } from '@/components/ui/Skeletons';
import { uiFlags } from '@/lib/uiFlags';
import { AnalyticsSection } from '@/components/dashboard/AnalyticsSection';

type DashboardStats = {
    totalBatches: number;
    totalTransactions: number;
    generatedTransactions: number;
    pendingTransactions: number;
};

export default function DashboardPage() {
    const [uiLoading, setUiLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        const t = window.setTimeout(() => setUiLoading(false), 350);
        return () => window.clearTimeout(t);
    }, []);

    useEffect(() => {
        const load = async () => {
            setStatsLoading(true);
            try {
                const res = await fetch('/api/dashboard/stats', { method: 'GET' });
                if (!res.ok) return;
                const data = (await res.json()) as DashboardStats;
                setStats(data);
            } finally {
                setStatsLoading(false);
            }
        };
        load();
    }, []);

    const statCards = useMemo(() => {
        const statConfig = [
            {
                title: 'Total Batches',
                value: stats?.totalBatches ?? 0,
                icon: IconFileSpreadsheet,
                color: 'blue',
                href: '/batches',
            },
            {
                title: 'Total Transactions',
                value: stats?.totalTransactions ?? 0,
                icon: IconReceipt,
                color: 'indigo',
                href: '/batches',
            },
            {
                title: 'Generated',
                value: stats?.generatedTransactions ?? 0,
                icon: IconCheck,
                color: 'green',
                href: '/batches',
            },
            {
                title: 'Pending',
                value: stats?.pendingTransactions ?? 0,
                icon: IconClock,
                color: 'orange',
                href: '/batches',
            },
        ] as const;

        return statConfig.map((stat) => (
            <Grid.Col key={stat.title} span={{ base: 12, xs: 6, md: 3 }}>
                {uiFlags.skeletons && (uiLoading || statsLoading) ? (
                    <StatCardSkeleton />
                ) : (
                    <UnstyledButton
                        component={Link}
                        href={stat.href}
                        className="rms-clickableCard"
                        style={{ display: 'block', width: '100%' }}
                    >
                        <Card padding="lg" radius="md" withBorder>
                            <Group justify="space-between" mb="xs">
                                <Text size="sm" c="dimmed" fw={500}>
                                    {stat.title}
                                </Text>
                                <ThemeIcon color={stat.color} variant="light" size="lg" radius="md">
                                    <stat.icon size={20} />
                                </ThemeIcon>
                            </Group>
                            <Text fw={700} size="xl">
                                {stat.value.toLocaleString()}
                            </Text>
                        </Card>
                    </UnstyledButton>
                )}
            </Grid.Col>
        ));
    }, [stats, uiLoading, statsLoading]);

    return (
        <Container size="xl" py="xl">
            {/* Page Header */}
            <Stack gap="xs" mb="xl">
                <Title order={2}>Dashboard</Title>
                <Text c="dimmed">Welcome to Receipt Management System</Text>
            </Stack>

            {/* Stats Grid */}
            <Grid mb="xl">
                {statCards}
            </Grid>

            {/* Analytics Section */}
            <Box mb="xl">
                <AnalyticsSection />
            </Box>

            {/* Quick Actions */}
            <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Card padding="xl" radius="md" withBorder>
                        <Group justify="space-between" mb="md">
                            <div>
                                <Text fw={600} size="lg" mb={4}>Quick Upload</Text>
                                <Text size="sm" c="dimmed">
                                    Upload Excel file to create new batch
                                </Text>
                            </div>
                            <ThemeIcon size="xl" radius="md" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                                <IconUpload size={24} />
                            </ThemeIcon>
                        </Group>
                        {uiFlags.skeletons && uiLoading ? (
                            <Skeleton height={36} radius="md" />
                        ) : (
                            <Button
                                component={Link}
                                href="/upload"
                                fullWidth
                                variant="light"
                                rightSection={<IconArrowRight size={16} />}
                            >
                                Go to Upload
                            </Button>
                        )}
                    </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Card padding="xl" radius="md" withBorder>
                        <Group justify="space-between" mb="md">
                            <div>
                                <Text fw={600} size="lg" mb={4}>Recent Batches</Text>
                                <Text size="sm" c="dimmed">
                                    View and manage your batches
                                </Text>
                            </div>
                            <ThemeIcon size="xl" radius="md" variant="gradient" gradient={{ from: 'indigo', to: 'violet' }}>
                                <IconFileSpreadsheet size={24} />
                            </ThemeIcon>
                        </Group>
                        {uiFlags.skeletons && uiLoading ? (
                            <Skeleton height={36} radius="md" />
                        ) : (
                            <Button
                                component={Link}
                                href="/batches"
                                fullWidth
                                variant="light"
                                rightSection={<IconArrowRight size={16} />}
                            >
                                View Batches
                            </Button>
                        )}
                    </Card>
                </Grid.Col>
            </Grid>

            {/* Status Info */}
            <Card mt="xl" padding="lg" radius="md" withBorder bg="blue.0">
                <Group>
                    <Badge size="lg" variant="filled">System Status</Badge>
                    <Text size="sm">
                        All systems operational. Database connected.
                    </Text>
                </Group>
            </Card>
        </Container>
    );
}
