'use client';

import { Button, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';

type EmptyStateAction =
    | { label: string; onClick: () => void; href?: never }
    | { label: string; href: string; onClick?: never }
    | undefined;

export function EmptyState({
    icon,
    title,
    description,
    action,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    action?: EmptyStateAction;
}) {
    return (
        <Stack align="center" gap="sm" py="xl">
            <ThemeIcon size={56} radius="xl" variant="light" color="gray">
                {icon}
            </ThemeIcon>
            <Stack align="center" gap={2}>
                <Title order={4} ta="center">
                    {title}
                </Title>
                <Text c="dimmed" size="sm" ta="center">
                    {description}
                </Text>
            </Stack>
            {action ? (
                <Group>
                    {'href' in action ? (
                        <Button component="a" href={action.href}>
                            {action.label}
                        </Button>
                    ) : (
                        <Button onClick={action.onClick}>{action.label}</Button>
                    )}
                </Group>
            ) : null}
        </Stack>
    );
}

