'use client';

import { useMemo, useState, useEffect } from 'react';
import {
    Container,
    Title,
    Text,
    Stack,
    Card,
    Group,
    Button,
    TextInput,
    Table,
    ActionIcon,
    Alert,
    Center,
    Modal,
    Tabs,
    Badge,
    Box,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import {
    IconPlus,
    IconEdit,
    IconTrash,
    IconCheck,
    IconAlertCircle,
    IconSettings,
    IconLayoutGrid,
} from '@tabler/icons-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeletons';
import { uiFlags } from '@/lib/uiFlags';

interface GlobalSetting {
    id: string;
    key: string;
    value: string;
    description: string | null;
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<GlobalSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [editingSetting, setEditingSetting] = useState<GlobalSetting | null>(null);
    const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
    const [activeTab, setActiveTab] = useState<'general' | 'finance' | 'templates' | 'system'>('general');

    const form = useForm({
        initialValues: {
            key: '',
            value: '',
            description: '',
        },
        validate: {
            key: (value) => (!value ? 'Key is required' : null),
            value: (value) => (!value ? 'Value is required' : null),
        },
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/settings');
            if (response.ok) {
                const data = await response.json();
                setSettings(data);
            }
        } catch {
            setError('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values: typeof form.values) => {
        setSaving(true);
        setError(null);

        try {
            const url = editingSetting
                ? `/api/settings/${editingSetting.id}`
                : '/api/settings';
            const method = editingSetting ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                throw new Error('Failed to save setting');
            }

            setSuccess(editingSetting ? 'Setting updated' : 'Setting created');
            closeModal();
            form.reset();
            setEditingSetting(null);
            fetchSettings();
        } catch {
            setError('Failed to save setting');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (setting: GlobalSetting) => {
        setEditingSetting(setting);
        form.setValues({
            key: setting.key,
            value: setting.value,
            description: setting.description || '',
        });
        openModal();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this setting?')) return;

        try {
            const response = await fetch(`/api/settings/${id}`, { method: 'DELETE' });
            if (response.ok) {
                setSettings(settings.filter((s) => s.id !== id));
                setSuccess('Setting deleted');
            }
        } catch {
            setError('Failed to delete setting');
        }
    };

    const handleNewSetting = () => {
        setEditingSetting(null);
        form.reset();
        openModal();
    };

    // Default settings that should exist
    const defaultSettings = [
        { key: 'nenkin_admin_rate', value: '0.15', description: 'Admin fee rate for Nenkin (15%)' },
        { key: 'nenkin_tax_fixed', value: '3500', description: 'Fixed tax for Nenkin' },
        { key: 'gensen_admin_rate', value: '0.40', description: 'Admin fee rate for Gensen (40%)' },
        { key: 'gensen_admin_fixed', value: '3000', description: 'Fixed admin fee for Gensen' },
        { key: 'default_exchange_rate', value: '115', description: 'Default JPY to IDR exchange rate' },
    ];

    const initializeDefaults = async () => {
        setSaving(true);
        try {
            for (const setting of defaultSettings) {
                const exists = settings.find((s) => s.key === setting.key);
                if (!exists) {
                    await fetch('/api/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(setting),
                    });
                }
            }
            setSuccess('Default settings initialized');
            fetchSettings();
        } catch {
            setError('Failed to initialize defaults');
        } finally {
            setSaving(false);
        }
    };

    const categorizedSettings = useMemo(() => {
        const buckets: Record<'general' | 'finance' | 'templates' | 'system', GlobalSetting[]> = {
            general: [],
            finance: [],
            templates: [],
            system: [],
        };

        for (const s of settings) {
            const key = s.key.toLowerCase();
            if (key.includes('template')) buckets.templates.push(s);
            else if (key.includes('nenkin') || key.includes('gensen') || key.includes('exchange') || key.includes('rate') || key.includes('tax')) buckets.finance.push(s);
            else if (key.includes('system') || key.includes('app') || key.includes('db')) buckets.system.push(s);
            else buckets.general.push(s);
        }

        return buckets;
    }, [settings]);

    const visibleSettings = categorizedSettings[activeTab];

    const needsNumber = (key: string) => {
        const k = key.toLowerCase();
        return k.includes('rate') || k.includes('tax') || k.includes('fixed') || k.includes('exchange');
    };

    return (
        <Container size="lg" py="xl">
            <Group justify="space-between" mb="xl">
                <Stack gap="xs">
                    <Title order={2}>Settings</Title>
                    <Text c="dimmed">Manage global application settings</Text>
                </Stack>

                <Group>
                    <Button
                        variant="light"
                        leftSection={<IconSettings size={16} />}
                        onClick={initializeDefaults}
                        loading={saving}
                    >
                        Initialize Defaults
                    </Button>
                    <Button
                        leftSection={<IconPlus size={16} />}
                        onClick={handleNewSetting}
                    >
                        Add Setting
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

            {success && (
                <Alert
                    color="green"
                    icon={<IconCheck size={16} />}
                    mb="md"
                    withCloseButton
                    onClose={() => setSuccess(null)}
                >
                    {success}
                </Alert>
            )}

            <Card padding="md" radius="md" withBorder>
                {uiFlags.settingsEnhancements ? (
                    <Tabs value={activeTab} onChange={(v) => setActiveTab((v as typeof activeTab) || 'general')}>
                        <Tabs.List>
                            <Tabs.Tab value="general">General</Tabs.Tab>
                            <Tabs.Tab value="finance">Finance Rules</Tabs.Tab>
                            <Tabs.Tab value="templates">Templates</Tabs.Tab>
                            <Tabs.Tab value="system">System</Tabs.Tab>
                        </Tabs.List>
                    </Tabs>
                ) : null}

                <Box mt="md">
                    {loading ? (
                        <TableSkeleton columns={4} rows={7} rowHeight={18} />
                    ) : visibleSettings.length === 0 ? (
                        <Center>
                            <EmptyState
                                icon={<IconLayoutGrid size={22} />}
                                title="No settings in this section"
                                description={settings.length === 0 ? 'Initialize defaults to get started.' : 'Try a different section.'}
                                action={settings.length === 0 ? { label: 'Initialize Defaults', onClick: initializeDefaults } : undefined}
                            />
                        </Center>
                    ) : (
                        <Table striped highlightOnHover verticalSpacing="sm">
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Setting</Table.Th>
                                    <Table.Th>Value</Table.Th>
                                    <Table.Th>Description</Table.Th>
                                    <Table.Th style={{ width: 100 }}>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {visibleSettings.map((setting) => {
                                    const numericHint = needsNumber(setting.key) && Number.isNaN(Number(setting.value));
                                    return (
                                        <Table.Tr key={setting.id}>
                                            <Table.Td>
                                                <Group gap="xs">
                                                    <Text fw={600} ff="monospace" size="sm">
                                                        {setting.key}
                                                    </Text>
                                                    {needsNumber(setting.key) ? (
                                                        <Badge size="xs" variant="light" color="blue">
                                                            Number
                                                        </Badge>
                                                    ) : null}
                                                </Group>
                                            </Table.Td>
                                            <Table.Td>
                                                <Stack gap={4}>
                                                    <TextInput
                                                        value={setting.value}
                                                        readOnly
                                                        size="sm"
                                                        styles={{ input: { fontFamily: 'monospace' } }}
                                                    />
                                                    {numericHint ? (
                                                        <Text size="xs" c="red">
                                                            Expected a number
                                                        </Text>
                                                    ) : null}
                                                </Stack>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm" c="dimmed">
                                                    {setting.description || '—'}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap="xs">
                                                    <ActionIcon variant="subtle" color="blue" onClick={() => handleEdit(setting)}>
                                                        <IconEdit size={16} />
                                                    </ActionIcon>
                                                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(setting.id)}>
                                                        <IconTrash size={16} />
                                                    </ActionIcon>
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                    );
                                })}
                            </Table.Tbody>
                        </Table>
                    )}
                </Box>
            </Card>

            {/* Add/Edit Modal */}
            <Modal
                opened={modalOpened}
                onClose={closeModal}
                title={editingSetting ? 'Edit Setting' : 'Add Setting'}
                centered
            >
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack>
                        <TextInput
                            label="Key"
                            placeholder="setting_key"
                            disabled={!!editingSetting}
                            {...form.getInputProps('key')}
                        />
                        <TextInput
                            label="Value"
                            placeholder="Value"
                            {...form.getInputProps('value')}
                        />
                        <TextInput
                            label="Description"
                            placeholder="Optional description"
                            {...form.getInputProps('description')}
                        />
                        <Group justify="flex-end" mt="md">
                            <Button variant="light" onClick={closeModal}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={saving}>
                                {editingSetting ? 'Update' : 'Create'}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Container>
    );
}
