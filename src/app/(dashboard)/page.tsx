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
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

type DashboardStats = {
    totalBatches: number;
    totalTransactions: number;
    generatedTransactions: number;
    pendingTransactions: number;
};

type Batch = {
    id: string;
    filename: string;
    uploadDate: string;
    status: string;
    totalRecords: number;
};

export default function DashboardPage() {
    const [uiLoading, setUiLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [recentBatches, setRecentBatches] = useState<Batch[]>([]);
    const [batchesLoading, setBatchesLoading] = useState(true);

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

    useEffect(() => {
        const loadBatches = async () => {
            setBatchesLoading(true);
            try {
                const res = await fetch('/api/batches');
                if (!res.ok) return;
                const data = await res.json();
                // Take top 2 recent batches
                setRecentBatches(data.slice(0, 2));
            } catch (error) {
                console.error('Failed to load batches', error);
            } finally {
                setBatchesLoading(false);
            }
        };
        loadBatches();
    }, []);

    const statCards = useMemo(() => {
        type StatItem = {
            title: string;
            value: number;
            icon: React.ElementType;
            color: string;
            change: string;
            href: string;
            highlight?: boolean;
        };

        const statConfig: StatItem[] = [
            {
                title: 'Total Batches',
                value: stats?.totalBatches ?? 0,
                icon: IconFileSpreadsheet,
                color: 'pink',
                change: '',
                href: '/batches',
            },
            {
                title: 'Total Transactions',
                value: stats?.totalTransactions ?? 0,
                icon: IconReceipt,
                color: 'green',
                change: '',
                href: '/batches',
            },
            {
                title: 'Generated Receipts',
                value: stats?.generatedTransactions ?? 0,
                icon: IconCheck,
                color: 'green',
                change: '',
                href: '/batches',
                highlight: true,
            },
            {
                title: 'Pending Review',
                value: stats?.pendingTransactions ?? 0,
                icon: IconClock,
                color: 'orange',
                change: '',
                href: '/batches',
            },
        ];

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
                        <Card
                            padding="lg"
                            radius="lg"
                            style={{
                                backgroundColor: stat.highlight ? 'var(--color-primary)' : 'var(--color-surface)',
                                color: stat.highlight ? 'white' : undefined,
                                border: 'none'
                            }}
                        >
                            <Group justify="space-between" mb="sm" align="flex-start">
                                <ThemeIcon
                                    color={stat.highlight ? 'white' : stat.color}
                                    variant={stat.highlight ? 'transparent' : 'light'}
                                    size="lg"
                                    radius="md"
                                    style={{
                                        color: stat.highlight ? 'white' : undefined,
                                        backgroundColor: stat.highlight ? 'rgba(255,255,255,0.2)' : undefined
                                    }}
                                >
                                    <stat.icon size={20} />
                                </ThemeIcon>
                                {stat.change && (
                                    <Badge
                                        variant={stat.highlight ? 'filled' : 'light'}
                                        color={stat.change.includes('+') ? 'green' : 'red'}
                                        bg={stat.highlight ? 'rgba(255,255,255,0.2)' : undefined}
                                        c={stat.highlight ? 'white' : undefined}
                                    >
                                        {stat.change}
                                    </Badge>
                                )}
                            </Group>
                            <Text fw={700} size="xl" style={{ fontSize: '2rem', lineHeight: 1 }} mb={4} c={stat.highlight ? 'white' : 'var(--color-text-heading)'}>
                                {stat.value.toLocaleString()}
                            </Text>
                            <Text size="sm" c={stat.highlight ? 'gray.2' : 'dimmed'} fw={500}>
                                {stat.title}
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
            <Group justify="space-between" align="center" mb="xl">
                <div>
                    <Title order={2} c="var(--color-text-heading)">Hello, Creative!</Title>
                    <Text c="dimmed" size="sm">Here is your daily overview</Text>
                </div>
                <Group>
                    <Button variant="default" radius="md">General</Button>
                    <Button variant="subtle" radius="md" color="gray">Workspace</Button>
                </Group>
            </Group>

            {/* Stats Grid */}
            <Grid mb={30}>
                {statCards}
            </Grid>

            {/* Analytics Section */}
            <Box mb={30}>
                <AnalyticsSection stats={stats} />
            </Box>

            {/* Quick Actions */}
            <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Card padding="xl" radius="lg" className="rms-clickableCard" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid transparent' }}>
                        <Group justify="space-between" mb="lg">
                            <div>
                                <Text fw={700} size="lg" mb={4} c="var(--color-text-heading)">Quick Upload</Text>
                                <Text size="sm" c="dimmed">
                                    Upload Receipt files here
                                </Text>
                            </div>
                            <ThemeIcon size={48} radius="xl" color="pink" variant="light" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                                <IconUpload size={24} />
                            </ThemeIcon>
                        </Group>

                        <Box
                            p="xl"
                            style={{
                                border: '2px dashed var(--color-primary-light)',
                                borderRadius: 'var(--mantine-radius-md)',
                                textAlign: 'center'
                            }}
                            mb="md"
                        >
                            <ThemeIcon variant="light" color="pink" radius="50%" size="xl" mb="sm">
                                <IconUpload size={24} />
                            </ThemeIcon>
                            <Text size="sm" fw={500} c="var(--color-text-heading)">Drag & drop receipt files here</Text>
                            <Text size="xs" c="dimmed">Support PDF, JPG, PNG</Text>
                        </Box>

                        {uiFlags.skeletons && uiLoading ? (
                            <Skeleton height={36} radius="md" />
                        ) : (
                            <Button
                                component={Link}
                                href="/upload"
                                fullWidth
                                variant="outline"
                                color="brand"
                                radius="md"
                            >
                                Browse Files
                            </Button>
                        )}
                    </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Card padding="xl" radius="lg" className="rms-clickableCard" style={{ backgroundColor: 'var(--color-surface)' }}>
                        <Group justify="space-between" mb="lg">
                            <div>
                                <Text fw={700} size="lg" mb={4} c="var(--color-text-heading)">Recent Batches</Text>
                                <Text size="sm" c="dimmed">
                                    History
                                </Text>
                            </div>
                            <ThemeIcon size={48} radius="xl" color="pink" variant="light" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                                <IconFileSpreadsheet size={24} />
                            </ThemeIcon>
                        </Group>

                        {/* Recent Batches List */}
                        <Stack gap="md" mb="md">
                            {batchesLoading ? (
                                <>
                                    <Group justify="space-between" wrap="nowrap">
                                        <Group gap="sm">
                                            <Skeleton height={40} width={40} radius="xl" />
                                            <div>
                                                <Skeleton height={16} width={120} mb={4} />
                                                <Skeleton height={12} width={80} />
                                            </div>
                                        </Group>
                                    </Group>
                                    <Group justify="space-between" wrap="nowrap">
                                        <Group gap="sm">
                                            <Skeleton height={40} width={40} radius="xl" />
                                            <div>
                                                <Skeleton height={16} width={120} mb={4} />
                                                <Skeleton height={12} width={80} />
                                            </div>
                                        </Group>
                                    </Group>
                                </>
                            ) : recentBatches.length > 0 ? (
                                recentBatches.map((batch) => (
                                    <Group key={batch.id} justify="space-between" wrap="nowrap">
                                        <Group gap="sm">
                                            <ThemeIcon radius="xl" size="lg" color="gray" variant="light">
                                                <IconFileSpreadsheet size={20} />
                                            </ThemeIcon>
                                            <div>
                                                <Text size="sm" fw={600} c="var(--color-text-heading)" lineClamp={1}>
                                                    {batch.filename}
                                                </Text>
                                                <Text size="xs" c="dimmed">
                                                    Uploaded • {batch.totalRecords} Items
                                                </Text>
                                            </div>
                                        </Group>
                                        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                                            {dayjs(batch.uploadDate).fromNow()}
                                        </Text>
                                    </Group>
                                ))
                            ) : (
                                <Text size="sm" c="dimmed" ta="center" py="md">
                                    No batches found
                                </Text>
                            )}
                        </Stack>

                        {uiFlags.skeletons && uiLoading ? (
                            <Skeleton height={36} radius="md" />
                        ) : (
                            <Button
                                component={Link}
                                href="/batches"
                                fullWidth
                                variant="light"
                                color="brand"
                                radius="md"
                                rightSection={<IconArrowRight size={16} />}
                            >
                                View All Batches
                            </Button>
                        )}
                    </Card>
                </Grid.Col>
            </Grid>
        </Container>
    );
}
