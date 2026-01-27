'use client';

import { useEffect, useState } from 'react';
import {
    Card,
    Group,
    Text,
    ThemeIcon,
    Stack,
    Skeleton,
    SegmentedControl,
    SimpleGrid,
    Box,
    Badge,
} from '@mantine/core';
import {
    IconChartBar,
    IconReceipt,
    IconCash,
    IconTrendingUp,
    IconTrendingDown,
    IconMinus,
} from '@tabler/icons-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Line,
    ComposedChart,
    Legend,
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
        return `Rp ${(value / 1_000_000_000).toFixed(1)}Miliar`;
    }
    if (value >= 1_000_000) {
        return `Rp ${(value / 1_000_000).toFixed(1)}JT`;
    }
    if (value >= 1_000) {
        return `Rp ${(value / 1_000).toFixed(0)}K`;
    }
    return `Rp ${value.toLocaleString()}`;
}

function formatNumber(value: number): string {
    return value.toLocaleString('id-ID');
}

type KpiCardProps = {
    title: string;
    value: string;
    subtitle?: string;
    icon: React.ElementType;
    color: string;
    trend?: number | null;
};

function KpiCard({ title, value, subtitle, icon: Icon, color, trend }: KpiCardProps) {
    return (
        <Card padding="md" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed" fw={500}>
                    {title}
                </Text>
                <ThemeIcon color={color} variant="light" size="md" radius="md">
                    <Icon size={16} />
                </ThemeIcon>
            </Group>
            <Text fw={700} size="xl" mb={2}>
                {value}
            </Text>
            {subtitle && (
                <Text size="xs" c="dimmed">
                    {subtitle}
                </Text>
            )}
            {trend !== undefined && trend !== null && (
                <Group gap={4} mt="xs">
                    {trend > 0 ? (
                        <IconTrendingUp size={14} color="var(--mantine-color-green-6)" />
                    ) : trend < 0 ? (
                        <IconTrendingDown size={14} color="var(--mantine-color-red-6)" />
                    ) : (
                        <IconMinus size={14} color="var(--mantine-color-gray-6)" />
                    )}
                    <Text size="xs" c={trend > 0 ? 'green' : trend < 0 ? 'red' : 'gray'} fw={500}>
                        {trend > 0 ? '+' : ''}
                        {trend}% dari bulan lalu
                    </Text>
                </Group>
            )}
        </Card>
    );
}

// Custom tooltip for the chart
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
    if (active && payload && payload.length) {
        const receiptCount = payload.find(p => p.dataKey === 'receiptCount')?.value ?? 0;
        const avgAmount = payload.find(p => p.dataKey === 'avgAmount')?.value ?? 0;

        return (
            <Card padding="sm" radius="md" shadow="md" withBorder>
                <Text fw={600} size="sm" mb="xs">
                    {label}
                </Text>
                <Stack gap={4}>
                    <Group gap="xs">
                        <Box w={12} h={12} bg="indigo.5" style={{ borderRadius: 2 }} />
                        <Text size="xs" c="dimmed">
                            Receipts:
                        </Text>
                        <Text size="xs" fw={600}>
                            {formatNumber(receiptCount)}
                        </Text>
                    </Group>
                    <Group gap="xs">
                        <Box w={12} h={12} bg="orange.5" style={{ borderRadius: 2 }} />
                        <Text size="xs" c="dimmed">
                            Rata-rata:
                        </Text>
                        <Text size="xs" fw={600}>
                            {formatCurrency(avgAmount)}
                        </Text>
                    </Group>
                </Stack>
            </Card>
        );
    }
    return null;
}

export function AnalyticsSection() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'6' | '12'>('12');
    const [error, setError] = useState<string | null>(null);

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
        <Card padding="xl" radius="md" withBorder>
            {/* Header */}
            <Group justify="space-between" mb="lg">
                <Group gap="sm">
                    <ThemeIcon size="lg" radius="md" variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }}>
                        <IconChartBar size={20} />
                    </ThemeIcon>
                    <div>
                        <Text fw={600}>Analytics</Text>
                        <Text size="sm" c="dimmed">
                            Receipt generation trends
                        </Text>
                    </div>
                </Group>
                <SegmentedControl
                    value={timeRange}
                    onChange={(value) => setTimeRange(value as '6' | '12')}
                    data={[
                        { label: '6 Bulan', value: '6' },
                        { label: '12 Bulan', value: '12' },
                    ]}
                    size="xs"
                />
            </Group>

            {/* Loading State */}
            {loading && (
                <Stack gap="md">
                    <Skeleton height={200} radius="md" />
                    <SimpleGrid cols={{ base: 2, md: 4 }}>
                        <Skeleton height={80} radius="md" />
                        <Skeleton height={80} radius="md" />
                        <Skeleton height={80} radius="md" />
                        <Skeleton height={80} radius="md" />
                    </SimpleGrid>
                </Stack>
            )}

            {/* Error State */}
            {error && !loading && (
                <Card padding="xl" radius="md" bg="red.0" ta="center">
                    <Text c="red" fw={500}>
                        {error}
                    </Text>
                </Card>
            )}

            {/* Empty State */}
            {!loading && !error && !hasData && (
                <Card padding="xl" radius="md" bg="gray.0" ta="center">
                    <Stack align="center" gap="sm">
                        <ThemeIcon size={48} radius="xl" variant="light" color="gray">
                            <IconChartBar size={24} />
                        </ThemeIcon>
                        <Text c="dimmed" fw={500}>
                            Belum ada data receipt
                        </Text>
                        <Text size="sm" c="dimmed">
                            Data analytics akan muncul setelah ada receipt yang di-generate
                        </Text>
                    </Stack>
                </Card>
            )}

            {/* Chart */}
            {!loading && !error && hasData && data && (
                <Stack gap="lg">
                    {/* Chart Container */}
                    <Box h={280}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={data.monthlyData}
                                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-2)" />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 11, fill: 'var(--mantine-color-gray-6)' }}
                                    tickLine={false}
                                    axisLine={{ stroke: 'var(--mantine-color-gray-3)' }}
                                />
                                <YAxis
                                    yAxisId="left"
                                    tick={{ fontSize: 11, fill: 'var(--mantine-color-gray-6)' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => value.toString()}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    tick={{ fontSize: 11, fill: 'var(--mantine-color-gray-6)' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => formatCurrency(value)}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    wrapperStyle={{ fontSize: 12 }}
                                    formatter={(value) =>
                                        value === 'receiptCount' ? 'Jumlah Receipt' : 'Rata-rata Amount'
                                    }
                                />
                                <Bar
                                    yAxisId="left"
                                    dataKey="receiptCount"
                                    fill="var(--mantine-color-indigo-5)"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={40}
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="avgAmount"
                                    stroke="var(--mantine-color-orange-5)"
                                    strokeWidth={2}
                                    dot={{ fill: 'var(--mantine-color-orange-5)', strokeWidth: 0, r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </Box>

                    {/* KPI Cards */}
                    <SimpleGrid cols={{ base: 2, md: 4 }}>
                        <KpiCard
                            title="Total Receipts"
                            value={formatNumber(data.summary.totalReceipts)}
                            subtitle={`${timeRange} bulan terakhir`}
                            icon={IconReceipt}
                            color="indigo"
                            trend={data.summary.growthPercent}
                        />
                        <KpiCard
                            title="Total Amount"
                            value={formatCurrency(data.summary.totalAmount)}
                            subtitle="Nominal keseluruhan"
                            icon={IconCash}
                            color="green"
                        />
                        <KpiCard
                            title="Rata-rata / Receipt"
                            value={formatCurrency(data.summary.avgPerReceipt)}
                            subtitle="Per transaksi"
                            icon={IconTrendingUp}
                            color="orange"
                        />
                        <KpiCard
                            title="Rata-rata / Bulan"
                            value={formatNumber(data.summary.avgPerMonth)}
                            subtitle="Receipt per bulan"
                            icon={IconChartBar}
                            color="cyan"
                        />
                    </SimpleGrid>
                </Stack>
            )}
        </Card>
    );
}
