'use client';

import { Box, Card, Group, Skeleton, Stack } from '@mantine/core';

export function StatCardSkeleton() {
    return (
        <Card padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
                <Skeleton height={12} width="55%" radius="sm" />
                <Skeleton height={36} width={36} radius="md" />
            </Group>
            <Skeleton height={28} width="40%" radius="sm" />
        </Card>
    );
}

export function TableSkeleton({
    columns = 5,
    rows = 6,
    rowHeight = 20,
}: {
    columns?: number;
    rows?: number;
    rowHeight?: number;
}) {
    return (
        <Stack gap="xs" p="md">
            <Group gap="sm">
                {Array.from({ length: columns }).map((_, idx) => (
                    <Skeleton key={idx} height={12} width={`${Math.max(10, 80 / columns)}%`} radius="sm" />
                ))}
            </Group>
            {Array.from({ length: rows }).map((_, idx) => (
                <Group key={idx} gap="sm" wrap="nowrap">
                    {Array.from({ length: columns }).map((__, colIdx) => (
                        <Skeleton key={colIdx} height={rowHeight} width="100%" radius="sm" />
                    ))}
                </Group>
            ))}
        </Stack>
    );
}

export function PanelSkeleton({ height }: { height: number }) {
    return (
        <Box p="md">
            <Skeleton height={height} radius="md" />
        </Box>
    );
}

