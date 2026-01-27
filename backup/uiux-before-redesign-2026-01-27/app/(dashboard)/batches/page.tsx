'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Container,
    Title,
    Text,
    Stack,
    Card,
    Group,
    Button,
    Badge,
    Table,
    ActionIcon,
    Center,
    Menu,
    Box,
    Select,
    SegmentedControl,
    Checkbox,
    Divider,
} from '@mantine/core';
import {
    IconEye,
    IconTrash,
    IconDotsVertical,
    IconPlus,
    IconRefresh,
    IconFileSpreadsheet,
    IconAdjustments,
} from '@tabler/icons-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeletons';
import { useGlobalSearch } from '@/components/ui/GlobalSearch';
import { uiFlags } from '@/lib/uiFlags';

interface Batch {
    id: string;
    filename: string;
    uploadDate: string;
    status: string;
    totalRecords: number;
}

const statusColors: Record<string, string> = {
    PENDING: 'yellow',
    PROCESSING: 'blue',
    COMPLETED: 'green',
    FAILED: 'red',
};

export default function BatchesPage() {
    const { debouncedQuery } = useGlobalSearch();

    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [yearFilter, setYearFilter] = useState<string | null>(null);
    const [typeFilter, setTypeFilter] = useState<string | null>(null);
    const [visibleColumns, setVisibleColumns] = useState({
        uploadDate: true,
        totalRecords: true,
        status: true,
    });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setStatusFilter(params.get('status'));
        setYearFilter(params.get('year'));
    }, []);

    useEffect(() => {
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/batches');
            if (response.ok) {
                const data = await response.json();
                setBatches(data);
            }
        } catch (error) {
            console.error('Failed to fetch batches:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this batch?')) return;

        try {
            const response = await fetch(`/api/batches/${id}`, { method: 'DELETE' });
            if (response.ok) {
                setBatches(batches.filter((b) => b.id !== id));
            }
        } catch (error) {
            console.error('Failed to delete batch:', error);
        }
    };

    const yearOptions = useMemo(() => {
        const years = new Set<string>();
        for (const b of batches) {
            const year = new Date(b.uploadDate).getFullYear();
            if (!Number.isNaN(year)) years.add(String(year));
        }
        return Array.from(years).sort((a, b) => Number(b) - Number(a));
    }, [batches]);

    const filteredBatches = useMemo(() => {
        const q = debouncedQuery.trim().toLowerCase();
        return batches.filter((b) => {
            if (statusFilter && b.status !== statusFilter) return false;
            if (yearFilter) {
                const year = String(new Date(b.uploadDate).getFullYear());
                if (year !== yearFilter) return false;
            }
            if (q) {
                const haystack = `${b.filename} ${b.status} ${b.uploadDate}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [batches, debouncedQuery, statusFilter, yearFilter]);

    return (
        <Container size="xl" py="xl">
            <Group justify="space-between" mb="xl">
                <Stack gap="xs">
                    <Title order={2}>Batches</Title>
                    <Text c="dimmed">Manage your uploaded batches</Text>
                </Stack>

                <Group>
                    <Button
                        variant="light"
                        leftSection={<IconRefresh size={16} />}
                        onClick={fetchBatches}
                    >
                        Refresh
                    </Button>
                    <Button
                        component={Link}
                        href="/upload"
                        leftSection={<IconPlus size={16} />}
                    >
                        New Upload
                    </Button>
                </Group>
            </Group>

            <Card padding="md" radius="md" withBorder>
                {uiFlags.batchesListEnhancements ? (
                    <Stack gap="sm">
                        <Group justify="space-between" wrap="wrap">
                            <Group gap="sm">
                                <Select
                                    label="Type"
                                    placeholder="All"
                                    data={[]}
                                    value={typeFilter}
                                    onChange={setTypeFilter}
                                    disabled
                                    w={160}
                                />
                                <Select
                                    label="Year"
                                    placeholder="All"
                                    data={yearOptions}
                                    value={yearFilter}
                                    onChange={setYearFilter}
                                    clearable
                                    w={140}
                                />
                                <Select
                                    label="Status"
                                    placeholder="All"
                                    data={Object.keys(statusColors)}
                                    value={statusFilter}
                                    onChange={setStatusFilter}
                                    clearable
                                    w={160}
                                />
                            </Group>

                            <Group gap="sm">
                                <SegmentedControl
                                    value={density}
                                    onChange={(v) => setDensity(v as 'comfortable' | 'compact')}
                                    data={[
                                        { label: 'Comfortable', value: 'comfortable' },
                                        { label: 'Compact', value: 'compact' },
                                    ]}
                                />
                                <Menu shadow="md" width={220}>
                                    <Menu.Target>
                                        <Button variant="light" leftSection={<IconAdjustments size={16} />}>
                                            Columns
                                        </Button>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Label>
                                            <Group gap="xs">
                                                <IconAdjustments size={14} />
                                                <Text size="xs" c="dimmed">
                                                    Visibility
                                                </Text>
                                            </Group>
                                        </Menu.Label>
                                        <Menu.Item closeMenuOnClick={false}>
                                            <Checkbox
                                                checked={visibleColumns.uploadDate}
                                                onChange={(e) =>
                                                    setVisibleColumns((prev) => ({ ...prev, uploadDate: e.currentTarget.checked }))
                                                }
                                                label="Upload Date"
                                            />
                                        </Menu.Item>
                                        <Menu.Item closeMenuOnClick={false}>
                                            <Checkbox
                                                checked={visibleColumns.totalRecords}
                                                onChange={(e) =>
                                                    setVisibleColumns((prev) => ({ ...prev, totalRecords: e.currentTarget.checked }))
                                                }
                                                label="Records"
                                            />
                                        </Menu.Item>
                                        <Menu.Item closeMenuOnClick={false}>
                                            <Checkbox
                                                checked={visibleColumns.status}
                                                onChange={(e) =>
                                                    setVisibleColumns((prev) => ({ ...prev, status: e.currentTarget.checked }))
                                                }
                                                label="Status"
                                            />
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            </Group>
                        </Group>

                        <Divider />
                    </Stack>
                ) : null}

                <Box mt={uiFlags.batchesListEnhancements ? 'md' : 0}>
                    {loading ? (
                        <TableSkeleton columns={5} rows={7} rowHeight={density === 'compact' ? 16 : 22} />
                    ) : filteredBatches.length === 0 ? (
                        <Center>
                            <EmptyState
                                icon={<IconFileSpreadsheet size={22} />}
                                title="No batches found"
                                description={debouncedQuery || statusFilter || yearFilter ? 'Try adjusting your filters.' : 'Upload your first file to get started.'}
                                action={{ label: 'New Upload', href: '/upload' }}
                            />
                        </Center>
                    ) : (
                        <Box style={{ maxHeight: 620, overflow: 'auto' }}>
                            <Table
                                striped
                                highlightOnHover
                                verticalSpacing={density === 'compact' ? 'xs' : 'md'}
                                horizontalSpacing="md"
                            >
                                <Table.Thead
                                    style={{
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 2,
                                        background: 'var(--mantine-color-white)',
                                    }}
                                >
                                    <Table.Tr>
                                        <Table.Th>Filename</Table.Th>
                                        {visibleColumns.uploadDate ? <Table.Th>Upload Date</Table.Th> : null}
                                        {visibleColumns.totalRecords ? <Table.Th>Records</Table.Th> : null}
                                        {visibleColumns.status ? <Table.Th>Status</Table.Th> : null}
                                        <Table.Th style={{ width: 100 }}>Actions</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {filteredBatches.map((batch) => (
                                        <Table.Tr key={batch.id}>
                                            <Table.Td>
                                                <Text fw={600}>{batch.filename}</Text>
                                            </Table.Td>
                                            {visibleColumns.uploadDate ? (
                                                <Table.Td>
                                                    {new Date(batch.uploadDate).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </Table.Td>
                                            ) : null}
                                            {visibleColumns.totalRecords ? <Table.Td>{batch.totalRecords}</Table.Td> : null}
                                            {visibleColumns.status ? (
                                                <Table.Td>
                                                    <Badge color={statusColors[batch.status] || 'gray'} variant="light">
                                                        {batch.status}
                                                    </Badge>
                                                </Table.Td>
                                            ) : null}
                                            <Table.Td>
                                                <Group gap="xs">
                                                    <ActionIcon
                                                        component={Link}
                                                        href={`/batches/${batch.id}`}
                                                        variant="subtle"
                                                        color="blue"
                                                    >
                                                        <IconEye size={16} />
                                                    </ActionIcon>
                                                    <Menu shadow="md" width={120}>
                                                        <Menu.Target>
                                                            <ActionIcon variant="subtle" color="gray">
                                                                <IconDotsVertical size={16} />
                                                            </ActionIcon>
                                                        </Menu.Target>
                                                        <Menu.Dropdown>
                                                            <Menu.Item
                                                                color="red"
                                                                leftSection={<IconTrash size={14} />}
                                                                onClick={() => handleDelete(batch.id)}
                                                            >
                                                                Delete
                                                            </Menu.Item>
                                                        </Menu.Dropdown>
                                                    </Menu>
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </Box>
                    )}
                </Box>
            </Card>
        </Container>
    );
}
