'use client';

import { useState, useEffect, useCallback, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    Container,
    Title,
    Text,
    Stack,
    Card,
    Group,
    Button,
    Badge,
    Alert,
    Breadcrumbs,
    Anchor,
    Progress,
    Modal,
    Select,
    SegmentedControl,
    Menu,
    Checkbox,
    Divider,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    IconArrowLeft,
    IconReceipt,
    IconCheck,
    IconAlertCircle,
    IconBolt,
    IconAdjustments,
} from '@tabler/icons-react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef, ColGroupDef, CellValueChangedEvent } from 'ag-grid-community';
import Decimal from 'decimal.js';
import { calculateTransaction } from '@/lib/calculations';
import Link from 'next/link';
import ExportModal, { ExportPreferences } from '@/components/ExportModal';
import { useGlobalSearch } from '@/components/ui/GlobalSearch';
import { uiFlags } from '@/lib/uiFlags';
import { PanelSkeleton } from '@/components/ui/Skeletons';
import { useToast } from '@/components/ui/ToastProvider';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

// Create custom theme
const customTheme = themeQuartz.withParams({
    accentColor: '#4F46E5',
    borderColor: '#E5E7EB',
});

interface Transaction {
    id: string;
    clientName: string;
    type: 'NENKIN_NORMAL' | 'NENKIN_SPEED' | 'GENSEN';
    rawNominalYen: string;
    regionalTaxYen: string;
    adminFeePercentage: string;
    taxRepresentativeFeeYen: string;
    taxFixed: string;
    speedServiceFee?: string;
    additionalCostLabel?: string;
    additionalCostAmount?: string;
    shippingFeeIdr: string;
    gensenYear?: string;
    note?: string;
    exchangeRate: string;
    finalNominalIdr: string;
    status: string;
}

interface Batch {
    id: string;
    filename: string;
    uploadDate: string;
    status: string;
    totalRecords: number;
    transactions: Transaction[];
}

export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { debouncedQuery } = useGlobalSearch();
    const { showToast } = useToast();
    const [batch, setBatch] = useState<Batch | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [selectedRows, setSelectedRows] = useState<Transaction[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [exportModalOpened, { open: openExportModal, close: closeExportModal }] = useDisclosure(false);
    const [progressModalOpened, { open: openProgressModal, close: closeProgressModal }] = useDisclosure(false);
    const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
    const [typeFilter, setTypeFilter] = useState<string | null>(null);
    const [yearFilter, setYearFilter] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [jpyVisibility, setJpyVisibility] = useState({
        rawNominalYen: true,
        regionalTaxYen: true,
        taxRepresentativeFeeYen: true,
        additionalCostLabel: true,
        additionalCostAmount: true,
    });

    const fetchBatch = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/batches/${id}`);
            if (response.ok) {
                const data = await response.json();
                setBatch(data);
            } else {
                setError('Batch not found');
            }
        } catch {
            setError('Failed to load batch');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchBatch();
    }, [fetchBatch]);

    const handleCellValueChanged = useCallback(async (event: CellValueChangedEvent) => {
        const { data, colDef } = event;
        const field = colDef.field;

        // Recalculate if nominal, exchange rate, or additional cost changed
        if (
            field === 'rawNominalYen' ||
            field === 'exchangeRate' ||
            field === 'additionalCostAmount' ||
            field === 'regionalTaxYen' ||
            field === 'shippingFeeIdr' ||
            field === 'taxRepresentativeFeeYen'
        ) {
            const result = calculateTransaction(
                data.type,
                data.rawNominalYen,
                data.exchangeRate,
                {
                    additionalCostAmount: data.additionalCostAmount || '0',
                    regionalTaxYen: data.regionalTaxYen || '0',
                    shippingFeeIdr: data.shippingFeeIdr || '0',
                    taxRepresentativeFeeYen: data.taxRepresentativeFeeYen || '0',
                }
            );

            // Update the row data
            data.finalNominalIdr = result.finalNominalIdr.toString();

            // Refresh the grid to show updated value
            event.api.refreshCells({ rowNodes: [event.node!], force: true });
        }

        // Save to server
        try {
            await fetch(`/api/transactions/${data.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    [field!]: data[field!],
                    finalNominalIdr: data.finalNominalIdr,
                }),
            });
        } catch (error) {
            console.error('Failed to update transaction:', error);
        }
    }, []);

    const handleExport = async (preferences: ExportPreferences) => {
        closeExportModal();
        setGenerating(true);
        setProgress(0);
        openProgressModal();

        try {
            const ids = selectedRows.map((row) => row.id);
            showToast({
                title: 'Proses Dimulai',
                message: `Memproses ${ids.length} kwitansi...`,
                color: 'blue',
            });

            // Start generation with export preferences
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionIds: ids,
                    exportPreferences: preferences,
                }),
            });

            if (!response.ok) {
                throw new Error('Generation failed');
            }

            const data = await response.json();

            // Poll for progress
            const pollInterval = setInterval(async () => {
                const statusResponse = await fetch(`/api/generate/${data.jobId}/status`);
                const statusData = await statusResponse.json();

                setProgress(statusData.progress);

                if (statusData.status === 'COMPLETED') {
                    clearInterval(pollInterval);
                    setGenerating(false);

                    showToast({
                        title: 'Selesai',
                        message: 'Mengunduh ZIP...',
                        color: 'green',
                    });

                    // Download the ZIP
                    window.location.href = `/api/generate/${data.jobId}/download`;
                    closeProgressModal();
                    fetchBatch(); // Refresh to show updated statuses
                } else if (statusData.status === 'FAILED') {
                    clearInterval(pollInterval);
                    setGenerating(false);
                    setError('Generation failed');
                    showToast({
                        title: 'Gagal',
                        message: 'Gagal membuat kwitansi.',
                        color: 'red',
                    });
                    closeProgressModal();
                }
            }, 1000);
        } catch {
            setGenerating(false);
            setError('Failed to generate receipts');
            showToast({
                title: 'Gagal',
                message: 'Gagal membuat kwitansi.',
                color: 'red',
            });
            closeProgressModal();
        }
    };

    const columnDefs = useMemo<(ColDef | ColGroupDef)[]>(() => [
        {
            headerCheckboxSelection: true,
            checkboxSelection: true,
            width: 50,
            pinned: 'left',
        },
        {
            field: 'clientName',
            headerName: 'Nama Klien',
            editable: true,
            minWidth: 180,
        },
        {
            field: 'type',
            headerName: 'Tipe',
            width: 140,
            cellRenderer: (params: { value: string }) => {
                const colors: Record<string, string> = {
                    NENKIN_NORMAL: 'indigo',
                    NENKIN_SPEED: 'violet',
                    GENSEN: 'green',
                };
                const labels: Record<string, string> = {
                    NENKIN_NORMAL: 'Nenkin',
                    NENKIN_SPEED: 'Nenkin Speed',
                    GENSEN: 'Gensen',
                };
                return (
                    <Badge
                        color={colors[params.value] || 'gray'}
                        size="sm"
                        leftSection={params.value === 'NENKIN_SPEED' ? <IconBolt size={12} /> : null}
                    >
                        {labels[params.value] || params.value}
                    </Badge>
                );
            },
        },
        {
            field: 'gensenYear',
            headerName: 'Tahun Gensen',
            editable: true,
            width: 120,
        },
        {
            headerName: 'Data Yen',
            children: [
                {
                    field: 'rawNominalYen',
                    headerName: 'Nominal Awal (¥)',
                    editable: true,
                    hide: !jpyVisibility.rawNominalYen,
                    width: 140,
                    type: 'numericColumn',
                    valueFormatter: (params) => {
                        const value = new Decimal(params.value || 0);
                        return `¥${value.toNumber().toLocaleString()}`;
                    },
                },
                {
                    field: 'regionalTaxYen',
                    headerName: 'Pajak Daerah (¥)',
                    editable: true,
                    hide: !jpyVisibility.regionalTaxYen,
                    width: 150,
                    type: 'numericColumn',
                    valueFormatter: (params) => {
                        if (!params.value || params.value === '0') return '-';
                        const value = new Decimal(params.value || 0);
                        return `¥${value.toNumber().toLocaleString()}`;
                    },
                },
                {
                    field: 'taxRepresentativeFeeYen',
                    headerName: 'Biaya Perwakilan Pajak (¥)',
                    editable: true,
                    hide: !jpyVisibility.taxRepresentativeFeeYen,
                    width: 150,
                    type: 'numericColumn',
                    valueFormatter: (params) => {
                        if (!params.value || params.value === '0') return '-';
                        const value = new Decimal(params.value || 0);
                        return `¥${value.toNumber().toLocaleString()}`;
                    },
                },
                {
                    field: 'additionalCostLabel',
                    headerName: 'Label Biaya Lain',
                    editable: true,
                    hide: !jpyVisibility.additionalCostLabel,
                    width: 160,
                },
                {
                    field: 'additionalCostAmount',
                    headerName: 'Biaya Lain (¥)',
                    editable: true,
                    hide: !jpyVisibility.additionalCostAmount,
                    width: 140,
                    type: 'numericColumn',
                    valueFormatter: (params) => {
                        if (!params.value || params.value === '0') return '-';
                        const value = new Decimal(params.value);
                        return `¥${value.toNumber().toLocaleString()}`;
                    },
                },
            ],
        },
        {
            headerName: 'Konversi',
            children: [
                {
                    field: 'exchangeRate',
                    headerName: 'Nilai Tukar (Kurs)',
                    editable: true,
                    width: 110,
                    type: 'numericColumn',
                },
            ],
        },
        {
            headerName: 'Data Rupiah',
            children: [
                {
                    field: 'shippingFeeIdr',
                    headerName: 'Potongan Ongkir (Rp)',
                    editable: true,
                    width: 150,
                    type: 'numericColumn',
                    valueFormatter: (params) => {
                        if (!params.value || params.value === '0') return '-';
                        const value = new Decimal(params.value || 0);
                        return new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            minimumFractionDigits: 0,
                        }).format(value.toNumber());
                    },
                },
                {
                    field: 'finalNominalIdr',
                    headerName: 'Total Transfer (Rp)',
                    width: 190,
                    type: 'numericColumn',
                    cellStyle: { fontWeight: 600, color: '#1e40af' },
                    valueFormatter: (params) => {
                        const value = new Decimal(params.value || 0);
                        return new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            minimumFractionDigits: 0,
                        }).format(value.toNumber());
                    },
                },
            ],
        },
        {
            field: 'note',
            headerName: 'Catatan',
            editable: true,
            width: 200,
            cellEditor: 'agLargeTextCellEditor',
            cellEditorPopup: true,
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            cellRenderer: (params: { value: string }) => (
                <Badge
                    color={params.value === 'GENERATED' ? 'green' : 'gray'}
                    size="sm"
                    leftSection={params.value === 'GENERATED' ? <IconCheck size={12} /> : null}
                >
                    {params.value}
                </Badge>
            ),
        },
    ], [jpyVisibility]);

    const defaultColDef = useMemo(() => ({
        sortable: true,
        resizable: true,
    }), []);

    const typeOptions = useMemo(() => {
        const types = new Set<string>();
        for (const tx of batch?.transactions || []) {
            if (tx.type) types.add(tx.type);
        }
        return Array.from(types);
    }, [batch?.transactions]);

    const yearOptions = useMemo(() => {
        const years = new Set<string>();
        for (const tx of batch?.transactions || []) {
            if (tx.gensenYear) years.add(tx.gensenYear);
        }
        return Array.from(years).sort((a, b) => Number(b) - Number(a));
    }, [batch?.transactions]);

    const statusOptions = useMemo(() => {
        const statuses = new Set<string>();
        for (const tx of batch?.transactions || []) {
            if (tx.status) statuses.add(tx.status);
        }
        return Array.from(statuses);
    }, [batch?.transactions]);

    const displayedTransactions = useMemo(() => {
        return (batch?.transactions || []).filter((tx) => {
            if (typeFilter && tx.type !== typeFilter) return false;
            if (yearFilter && tx.gensenYear !== yearFilter) return false;
            if (statusFilter && tx.status !== statusFilter) return false;
            return true;
        });
    }, [batch?.transactions, typeFilter, yearFilter, statusFilter]);

    if (loading) {
        return (
            <Container size="xl" py="xl">
                <Card padding={0} radius="md" withBorder>
                    <PanelSkeleton height={420} />
                </Card>
            </Container>
        );
    }

    if (error && !batch) {
        return (
            <Container size="xl" py="xl">
                <Alert color="red" icon={<IconAlertCircle />}>
                    {error}
                </Alert>
            </Container>
        );
    }

    return (
        <Container size="xl" py="xl">
            {/* Breadcrumbs */}
            <Breadcrumbs mb="md">
                <Anchor component={Link} href="/batches" size="sm">
                    Batches
                </Anchor>
                <Text size="sm">{batch?.filename}</Text>
            </Breadcrumbs>

            {/* Header */}
            <Group justify="space-between" mb="xl">
                <Stack gap="xs">
                    <Group>
                        <Button
                            variant="subtle"
                            leftSection={<IconArrowLeft size={16} />}
                            onClick={() => router.back()}
                            size="sm"
                        >
                            Back
                        </Button>
                        <Title order={2}>{batch?.filename}</Title>
                        <Badge color="blue" size="lg">{batch?.totalRecords} records</Badge>
                    </Group>
                    <Text c="dimmed" size="sm">
                        Uploaded on {new Date(batch?.uploadDate || '').toLocaleString()}
                    </Text>
                </Stack>

                <Group>
                    <Button
                        leftSection={<IconReceipt size={16} />}
                        onClick={openExportModal}
                        disabled={selectedRows.length === 0 || generating}
                    >
                        Buat Kwitansi ({selectedRows.length})
                    </Button>
                </Group>
            </Group>

            {error && (
                <Alert
                    color="red"
                    icon={<IconAlertCircle size={16} />}
                    mb="md"
                    withCloseButton
                    onClose={() => setError(null)}
                >
                    {error}
                </Alert>
            )}

            {/* AG Grid */}
            <Card padding={0} radius="md" withBorder>
                {uiFlags.batchDetailEnhancements ? (
                    <Stack p="md" gap="sm">
                        <Group justify="space-between" wrap="wrap">
                            <Group gap="sm">
                                <Select
                                    label="Type"
                                    placeholder="All"
                                    data={typeOptions}
                                    value={typeFilter}
                                    onChange={setTypeFilter}
                                    clearable
                                    w={180}
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
                                    data={statusOptions}
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
                                <Menu shadow="md" width={260} position="bottom-end">
                                    <Menu.Target>
                                        <Button variant="light" leftSection={<IconAdjustments size={16} />}>
                                            JPY Columns
                                        </Button>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Label>JPY Layer</Menu.Label>
                                        <Menu.Item closeMenuOnClick={false}>
                                            <Checkbox
                                                checked={jpyVisibility.rawNominalYen}
                                                onChange={(e) =>
                                                    setJpyVisibility((prev) => ({ ...prev, rawNominalYen: e.currentTarget.checked }))
                                                }
                                                label="Base (¥)"
                                            />
                                        </Menu.Item>
                                        <Menu.Item closeMenuOnClick={false}>
                                            <Checkbox
                                                checked={jpyVisibility.regionalTaxYen}
                                                onChange={(e) =>
                                                    setJpyVisibility((prev) => ({ ...prev, regionalTaxYen: e.currentTarget.checked }))
                                                }
                                                label="Regional Tax (¥)"
                                            />
                                        </Menu.Item>
                                        <Menu.Item closeMenuOnClick={false}>
                                            <Checkbox
                                                checked={jpyVisibility.taxRepresentativeFeeYen}
                                                onChange={(e) =>
                                                    setJpyVisibility((prev) => ({
                                                        ...prev,
                                                        taxRepresentativeFeeYen: e.currentTarget.checked,
                                                    }))
                                                }
                                                label="Tax Rep Fee (¥)"
                                            />
                                        </Menu.Item>
                                        <Menu.Item closeMenuOnClick={false}>
                                            <Checkbox
                                                checked={jpyVisibility.additionalCostLabel}
                                                onChange={(e) =>
                                                    setJpyVisibility((prev) => ({ ...prev, additionalCostLabel: e.currentTarget.checked }))
                                                }
                                                label="Other Yen Label"
                                            />
                                        </Menu.Item>
                                        <Menu.Item closeMenuOnClick={false}>
                                            <Checkbox
                                                checked={jpyVisibility.additionalCostAmount}
                                                onChange={(e) =>
                                                    setJpyVisibility((prev) => ({
                                                        ...prev,
                                                        additionalCostAmount: e.currentTarget.checked,
                                                    }))
                                                }
                                                label="Other Yen (¥)"
                                            />
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            </Group>
                        </Group>
                        <Divider />
                        <Text size="sm" c="dimmed">
                            Showing {displayedTransactions.length} of {batch?.transactions.length ?? 0} transactions
                            {debouncedQuery ? ` • Search: “${debouncedQuery}”` : ''}
                        </Text>
                    </Stack>
                ) : null}

                <div style={{ height: 600, width: '100%' }}>
                    <AgGridReact
                        theme={customTheme}
                        rowData={displayedTransactions}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDef}
                        quickFilterText={debouncedQuery}
                        rowHeight={density === 'compact' ? 32 : 42}
                        rowSelection="multiple"
                        onSelectionChanged={(event) => {
                            setSelectedRows(event.api.getSelectedRows());
                        }}
                        onCellValueChanged={handleCellValueChanged}
                        animateRows
                        suppressRowClickSelection
                    />
                </div>
            </Card>

            {/* Export Preferences Modal */}
            <ExportModal
                opened={exportModalOpened}
                onClose={closeExportModal}
                onConfirm={handleExport}
                loading={generating}
            />

            {/* Progress Modal */}
            <Modal
                opened={progressModalOpened}
                onClose={closeProgressModal}
                title="Membuat Kwitansi"
                centered
                closeOnClickOutside={false}
                closeOnEscape={false}
                withCloseButton={!generating}
            >
                <Stack>
                    <Text size="sm">
                        Memproses {selectedRows.length} kwitansi...
                    </Text>
                    <Progress value={progress} animated />
                    <Text size="xs" c="dimmed" ta="center">
                        {progress}% complete
                    </Text>
                </Stack>
            </Modal>
        </Container>
    );
}
