'use client';

import { useEffect, useState } from 'react';
import {
    Card,
    Group,
    Text,
    ThemeIcon,
    Stack,
    Skeleton,
    SimpleGrid,
    Box,
} from '@mantine/core';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';

type MonthlyDataPoint = {
    month: string;
    label: string;
    receiptCount: number;
    totalAmount: number;
    avgAmount: number;
};

type AnalyticsData = {
    monthlyData: MonthlyDataPoint[];
    summary: {
        totalReceipts: number;
        totalAmount: number;
        avgPerReceipt: number;
        avgPerMonth: number;
        growthPercent: number | null;
    };
};

function formatCurrency(value: number): string {
    if (value >= 1_000_000_000) {
        return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000_000) {
        return `Rp ${(value / 1_000_000).toFixed(1)}JT`;
    }
    return `Rp ${value.toLocaleString()}`;
}

function formatNumber(value: number): string {
    return value.toLocaleString('id-ID');
}

type DashboardStats = {
    totalBatches: number;
    totalTransactions: number;
    generatedTransactions: number;
    pendingTransactions: number;
};

export function AnalyticsSection({ stats }: { stats: DashboardStats | null }) {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'6' | '12'>('12');
    const [error, setError] = useState<string | null>(null);

    // Calculate real status data
    const total = stats?.totalTransactions || 0;
    const generated = stats?.generatedTransactions || 0;
    const pending = stats?.pendingTransactions || 0;

    // Safety check div by zero
    const generatedPercent = total > 0 ? Math.round((generated / total) * 100) : 0;
    const pendingPercent = total > 0 ? Math.round((pending / total) * 100) : 0;

    const complianceData = [
        { name: 'Generated', value: generatedPercent || 100, color: 'var(--color-primary)' }, // fallback to 100 visual if 0 to avoid empty chart
        { name: 'Pending', value: pendingPercent, color: '#fce7f3' },
    ];

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/dashboard/analytics?months=${timeRange}`);
                if (!res.ok) throw new Error('Failed to fetch analytics');
                const json = await res.json();
                setData(json);
            } catch (err) {
                console.error('Analytics fetch error:', err);
                setError('Gagal memuat data analytics');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [timeRange]);

    const hasData = data && data.monthlyData.some(d => d.receiptCount > 0);

    return (
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
            {/* Trends Chart (2/3 width) */}
            <Card padding="xl" radius="lg" className="rms-clickableCard" style={{ gridColumn: 'span 2', backgroundColor: 'var(--color-surface)', border: 'none' }}>
                <Group justify="space-between" mb="lg">
                    <div>
                        <Text fw={700} size="lg" c="var(--color-text-heading)">Receipt Generation Trends</Text>
                        <Text size="sm" c="dimmed">Monthly overview of processed documents</Text>
                    </div>
                    <Group gap="xs">
                        <Group gap={4}>
                            <Box w={8} h={8} bg="brand.5" style={{ borderRadius: '50%' }} />
                            <Text size="xs" c="dimmed">Approved</Text>
                        </Group>
                        <Group gap={4}>
                            <Box w={8} h={8} bg="pink.1" style={{ borderRadius: '50%' }} />
                            <Text size="xs" c="dimmed">Pending</Text>
                        </Group>
                    </Group>
                </Group>

                {loading ? (
                    <Skeleton height={280} radius="md" />
                ) : hasData && data ? (
                    <Box h={300}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.monthlyData} barGap={0} barSize={12}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="label"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar
                                    dataKey="receiptCount"
                                    fill="var(--color-primary)"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                ) : (
                    <Stack align="center" justify="center" h={300} bg="gray.0" style={{ borderRadius: '12px' }}>
                        <Text c="dimmed">No data available</Text>
                    </Stack>
                )}
            </Card>

            {/* Generate Status Chart (1/3 width) */}
            <Card padding="xl" radius="lg" className="rms-clickableCard" style={{ backgroundColor: 'var(--color-surface)', border: 'none' }}>
                <Text fw={700} size="lg" c="var(--color-text-heading)" mb="lg">Generate Status</Text>

                <Box h={200} pos="relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={complianceData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                            >
                                {complianceData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Centered Text */}
                    <Stack gap={0} align="center" justify="center" pos="absolute" top={0} left={0} right={0} bottom={0} style={{ pointerEvents: 'none' }}>
                        <Text fw={800} size="xl" fz={28}>{total > 0 ? generatedPercent : 0}%</Text>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Generated</Text>
                    </Stack>
                </Box>

                <Stack mt="xl" gap="sm">
                    <Card padding="sm" radius="md" withBorder style={{ borderColor: '#f1f5f9' }}>
                        <Group justify="space-between">
                            <Group gap="xs">
                                <Box w={4} h={16} bg="brand.5" style={{ borderRadius: 4 }} />
                                <Text size="sm" fw={500}>Generated</Text>
                            </Group>
                            <Text size="sm" fw={700}>{formatNumber(generated)}</Text>
                            <Text size="sm" fw={700} c="brand">{generatedPercent}%</Text>
                        </Group>
                    </Card>
                    <Card padding="sm" radius="md" withBorder style={{ borderColor: '#f1f5f9' }}>
                        <Group justify="space-between">
                            <Group gap="xs">
                                <Box w={4} h={16} bg="pink.2" style={{ borderRadius: 4 }} />
                                <Text size="sm" fw={500}>Pending</Text>
                            </Group>
                            <Text size="sm" fw={700}>{formatNumber(pending)}</Text>
                            <Text size="sm" fw={700} c="dimmed">{pendingPercent}%</Text>
                        </Group>
                    </Card>
                </Stack>
            </Card>
        </SimpleGrid>
    );
}
