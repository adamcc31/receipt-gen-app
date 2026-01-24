'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Container,
    Title,
    Text,
    Stack,
    Card,
    Group,
    Button,
    Progress,
    Alert,
    ThemeIcon,
    Box,
    rem,
    Stepper,
    Badge,
    Divider,
} from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import {
    IconUpload,
    IconFile,
    IconX,
    IconCheck,
    IconAlertCircle,
    IconFileSpreadsheet,
    IconDownload,
} from '@tabler/icons-react';
import { useToast } from '@/components/ui/ToastProvider';

export default function UploadPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [detectedRowCount, setDetectedRowCount] = useState<number | null>(null);

    const activeStep = success
        ? 3
        : uploading
            ? progress < 30
                ? 0
                : progress < 65
                    ? 1
                    : 2
            : 0;

    const columnsPreview = [
        { name: 'Nama Client', required: true, example: 'ABDUL ROUF ATAMIMI' },
        { name: 'Tipe', required: true, example: 'NENKIN / NENKIN SPEED / GENSEN' },
        { name: 'Nominal', required: true, example: '100000' },
        { name: 'Kurs', required: false, example: '115' },
        { name: 'Regional Tax (Yen)', required: false, example: '0' },
        { name: 'Shipping Fee (IDR)', required: false, example: '100000' },
        { name: 'Tax Rep Fee (Yen)', required: false, example: '3000' },
        { name: 'Gensen Year', required: false, example: '2024' },
    ] as const;

    const formatBytes = (bytes: number) => {
        const units = ['B', 'KB', 'MB', 'GB'];
        let value = bytes;
        let unitIndex = 0;
        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex += 1;
        }
        return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
    };

    const handleDownloadTemplate = useCallback(async () => {
        try {
            const response = await fetch('/api/template/excel', { method: 'GET' });
            if (!response.ok) {
                throw new Error('Failed to download template');
            }
            const arrayBuffer = await response.arrayBuffer();
            const blob = new Blob([arrayBuffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'transactions-template.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch {
            setError('Failed to download template');
            showToast({ title: 'Template download failed', message: 'Could not download the Excel template.', color: 'red' });
        }
    }, [showToast]);

    const handleUpload = useCallback(async (files: File[]) => {
        if (files.length === 0) return;

        const file = files[0];
        setUploading(true);
        setError(null);
        setSuccess(null);
        setProgress(0);

        try {
            // Simulate progress
            const progressInterval = setInterval(() => {
                setProgress((prev) => Math.min(prev + 10, 90));
            }, 200);

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);
            setProgress(100);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Upload failed');
            }

            const data = await response.json();
            setSuccess(`Successfully uploaded ${data.totalRecords} transactions`);
            setDetectedRowCount(data.totalRecords);
            showToast({ title: 'Upload complete', message: 'Batch created successfully.', color: 'green' });

            // Redirect to batch detail after 2 seconds
            setTimeout(() => {
                router.push(`/batches/${data.batchId}`);
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
            setProgress(0);
            showToast({ title: 'Upload failed', message: 'Please check the file and try again.', color: 'red' });
        } finally {
            setUploading(false);
        }
    }, [router, showToast]);

    return (
        <Container size="md" py="xl">
            <Stack gap="xs" mb="xl">
                <Title order={2}>Upload File Excel</Title>
                <Text c="dimmed">
                    Upload file Excel (.xlsx) yang berisi data transaksi
                </Text>
            </Stack>

            <Card padding="lg" radius="md" withBorder mb="md">
                <Stepper active={activeStep} size="sm">
                    <Stepper.Step label="Upload" description="Select file" />
                    <Stepper.Step label="Validate" description="Check columns" />
                    <Stepper.Step label="Process" description="Create batch" />
                    <Stepper.Completed>Complete</Stepper.Completed>
                </Stepper>
            </Card>

            {error && (
                <Alert
                    icon={<IconAlertCircle size={16} />}
                    title="Upload Error"
                    color="red"
                    mb="md"
                    withCloseButton
                    onClose={() => setError(null)}
                >
                    {error}
                </Alert>
            )}

            {success && (
                <Alert
                    icon={<IconCheck size={16} />}
                    title="Upload Successful"
                    color="green"
                    mb="md"
                >
                    {success}
                </Alert>
            )}

            <Card padding="xl" radius="md" withBorder>
                <Dropzone
                    onDrop={(files) => {
                        setSelectedFile(files[0] || null);
                        setDetectedRowCount(null);
                        handleUpload(files);
                    }}
                    onReject={(files) => setError(`File rejected: ${files[0]?.errors?.[0]?.message || 'Invalid file'}`)}
                    maxSize={10 * 1024 * 1024} // 10MB
                    accept={[MIME_TYPES.xlsx]}
                    loading={uploading}
                    disabled={uploading}
                >
                    <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: 'none' }}>
                        <Dropzone.Accept>
                            <IconUpload
                                style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-blue-6)' }}
                                stroke={1.5}
                            />
                        </Dropzone.Accept>
                        <Dropzone.Reject>
                            <IconX
                                style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-red-6)' }}
                                stroke={1.5}
                            />
                        </Dropzone.Reject>
                        <Dropzone.Idle>
                            <IconFileSpreadsheet
                                style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-dimmed)' }}
                                stroke={1.5}
                            />
                        </Dropzone.Idle>

                        <div>
                            <Text size="xl" inline>
                                Tarik file Excel ke sini atau klik untuk memilih
                            </Text>
                            <Text size="sm" c="dimmed" inline mt={7}>
                                File harus tidak lebih dari 10MB. Hanya file .xlsx yang diterima.
                            </Text>
                        </div>
                    </Group>
                </Dropzone>

                {uploading && (
                    <Box mt="md">
                        <Text size="sm" mb="xs">Uploading and processing...</Text>
                        <Progress value={progress} animated />
                    </Box>
                )}

                {selectedFile ? (
                    <Box mt="lg">
                        <Divider mb="md" />
                        <Group justify="space-between" align="flex-start" wrap="wrap">
                            <Group>
                                <ThemeIcon color="blue" variant="light" size="lg" radius="md">
                                    <IconFileSpreadsheet size={20} />
                                </ThemeIcon>
                                <div>
                                    <Text fw={600}>{selectedFile.name}</Text>
                                    <Text size="sm" c="dimmed">
                                        {formatBytes(selectedFile.size)}
                                        {detectedRowCount !== null ? ` • ${detectedRowCount} rows detected` : ' • Row count: —'}
                                    </Text>
                                </div>
                            </Group>
                            <Button
                                variant="light"
                                leftSection={<IconDownload size={16} />}
                                onClick={handleDownloadTemplate}
                                disabled={uploading}
                            >
                                Unduh Template Excel
                            </Button>
                        </Group>

                        <Box mt="md">
                            <Text fw={600} size="sm" mb="xs">
                                Column validation preview
                            </Text>
                            <Stack gap={6}>
                                {columnsPreview.map((col) => (
                                    <Group key={col.name} justify="space-between">
                                        <Text size="sm">{col.name}</Text>
                                        <Badge
                                            variant="light"
                                            color={col.required ? 'green' : 'yellow'}
                                        >
                                            {col.required ? 'Valid' : 'Warning'}
                                        </Badge>
                                    </Group>
                                ))}
                            </Stack>
                            <Text size="xs" c="dimmed" mt="xs">
                                Preview is non-blocking and does not change validation rules.
                            </Text>
                        </Box>
                    </Box>
                ) : null}
            </Card>

            {/* Expected Format */}
            <Card mt="xl" padding="lg" radius="md" withBorder>
                <Group mb="md">
                    <ThemeIcon color="blue" variant="light" size="lg" radius="md">
                        <IconFile size={20} />
                    </ThemeIcon>
                    <Text fw={600}>Format File yang Diharapkan</Text>
                </Group>

                <Text size="sm" c="dimmed" mb="md">
                    File Excel Anda harus berformat .xlsx dan menyertakan kolom berikut:
                </Text>

                <Box
                    component="table"
                    style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '14px',
                    }}
                >
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Column</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Required</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Example</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Nama Client</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>✓</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>ABDUL ROUF ATAMIMI</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Tipe</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>✓</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>
                                NENKIN / NENKIN SPEED / GENSEN
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Nominal</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>✓</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>100000</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Kurs</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Optional</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>115</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Regional Tax (Yen)</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Optional</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>0</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Shipping Fee (IDR)</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Optional</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>100000</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Tax Rep Fee (Yen)</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Optional</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>3000</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Gensen Year</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Required for GENSEN</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>2024</td>
                        </tr>
                    </tbody>
                </Box>

                <Group mt="md">
                    <Button
                        variant="subtle"
                        size="sm"
                        leftSection={<IconDownload size={16} />}
                        onClick={handleDownloadTemplate}
                    >
                        Unduh Contoh (.xlsx)
                    </Button>
                    <Text size="xs" c="dimmed">
                        Tipe: NENKIN = Nenkin Normal, NENKIN SPEED = Nenkin Speed, GENSEN = Gensen.
                    </Text>
                </Group>
            </Card>
        </Container>
    );
}
