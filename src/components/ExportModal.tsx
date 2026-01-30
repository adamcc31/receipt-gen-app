/**
 * Export Modal Component
 * 
 * Allows users to select export preferences:
 * - Format: PDF, JPG, or BOTH
 * - Folder Structure: FLAT_BULK or GROUP_BY_FOLDER
 */

import { Modal, Stack, Checkbox, Radio, Group, Button, Text, Select, Switch } from '@mantine/core';
import { useState } from 'react';
import { IconFileTypePdf, IconPhoto, IconFolderOpen, IconFiles } from '@tabler/icons-react';

export interface ExportPreferences {
    formats: ('PDF' | 'JPG')[];
    folderStructure: 'FLAT_BULK' | 'GROUP_BY_FOLDER';
}

interface ExportModalProps {
    opened: boolean;
    onClose: () => void;
    onConfirm: (preferences: ExportPreferences) => void;
    loading?: boolean;
}

export default function ExportModal({ opened, onClose, onConfirm, loading }: ExportModalProps) {
    const [pdfChecked, setPdfChecked] = useState(true);
    const [jpgChecked, setJpgChecked] = useState(false);
    const [folderStructure, setFolderStructure] = useState<'FLAT_BULK' | 'GROUP_BY_FOLDER'>('FLAT_BULK');
    const [language] = useState('English');
    const [currencyDisplay] = useState(true);

    const handleBothChange = (checked: boolean) => {
        setPdfChecked(checked);
        setJpgChecked(checked);
    };

    const handleConfirm = () => {
        const formats: ('PDF' | 'JPG')[] = [];
        if (pdfChecked) formats.push('PDF');
        if (jpgChecked) formats.push('JPG');

        if (formats.length === 0) {
            return; // Validation: at least one format must be selected
        }

        onConfirm({
            formats,
            folderStructure,
        });
    };

    const isValid = pdfChecked || jpgChecked;
    const isBothChecked = pdfChecked && jpgChecked;

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Export Preferences"
            centered
            size="md"
            closeOnClickOutside={!loading}
            closeOnEscape={!loading}
            withCloseButton={!loading}
        >
            <Stack gap="xl">
                {/* Format Selection */}
                <div>
                    <Text size="sm" fw={600} mb="xs">
                        File Format
                    </Text>
                    <Stack gap="sm">
                        <Checkbox
                            label={
                                <Group gap="xs">
                                    <IconFileTypePdf size={18} />
                                    <span>PDF</span>
                                </Group>
                            }
                            checked={pdfChecked}
                            onChange={(e) => setPdfChecked(e.currentTarget.checked)}
                            disabled={loading}
                        />
                        <Checkbox
                            label={
                                <Group gap="xs">
                                    <IconPhoto size={18} />
                                    <span>JPG</span>
                                </Group>
                            }
                            checked={jpgChecked}
                            onChange={(e) => setJpgChecked(e.currentTarget.checked)}
                            disabled={loading}
                        />
                        <Checkbox
                            label={
                                <Group gap="xs">
                                    <IconFiles size={18} />
                                    <span><strong>BOTH</strong> (PDF + JPG)</span>
                                </Group>
                            }
                            checked={isBothChecked}
                            onChange={(e) => handleBothChange(e.currentTarget.checked)}
                            disabled={loading}
                        />
                    </Stack>
                    {!isValid && (
                        <Text size="xs" c="red" mt="xs">
                            Please select at least one format
                        </Text>
                    )}
                </div>

                {/* Folder Structure Selection */}
                <div>
                    <Text size="sm" fw={600} mb="xs">
                        Folder Structure
                    </Text>
                    <Radio.Group
                        value={folderStructure}
                        onChange={(value) => setFolderStructure(value as 'FLAT_BULK' | 'GROUP_BY_FOLDER')}
                    >
                        <Stack gap="sm">
                            <Radio
                                value="FLAT_BULK"
                                label={
                                    <div>
                                        <Group gap="xs" mb={4}>
                                            <IconFiles size={18} />
                                            <Text fw={500}>Flat Bulk (Default)</Text>
                                        </Group>
                                        <Text size="xs" c="dimmed" ml={26}>
                                            All files in ZIP root: 01_DD-MM-YYYY_ClientName_Type.ext
                                        </Text>
                                    </div>
                                }
                                disabled={loading}
                            />
                            <Radio
                                value="GROUP_BY_FOLDER"
                                label={
                                    <div>
                                        <Group gap="xs" mb={4}>
                                            <IconFolderOpen size={18} />
                                            <Text fw={500}>Group by Folder</Text>
                                        </Group>
                                        <Text size="xs" c="dimmed" ml={26}>
                                            One folder per client: ClientName/Date_Type.ext
                                        </Text>
                                    </div>
                                }
                                disabled={loading}
                            />
                        </Stack>
                    </Radio.Group>
                </div>

                <div>
                    <Text size="sm" fw={600} mb="xs">
                        Display Options
                    </Text>
                    <Stack gap="sm">
                        <Select
                            label="Language"
                            value={language}
                            data={['English']}
                            disabled
                            description="Language is fixed in the current export pipeline."
                        />
                        <Switch
                            label="Currency display"
                            checked={currencyDisplay}
                            disabled
                            description="Visual-only option (not supported by export output yet)."
                        />
                    </Stack>
                </div>

                {/* Action Buttons */}
                <Group justify="flex-end" mt="md">
                    <Button
                        variant="subtle"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!isValid || loading}
                        loading={loading}
                    >
                        Export
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
