'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { useDebouncedValue } from '@mantine/hooks';

type GlobalSearchContextValue = {
    query: string;
    debouncedQuery: string;
    setQuery: (next: string) => void;
    clear: () => void;
};

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null);

export function GlobalSearchProvider({
    children,
    debounceMs = 250,
}: {
    children: React.ReactNode;
    debounceMs?: number;
}) {
    const [query, setQuery] = useState('');
    const [debouncedQuery] = useDebouncedValue(query, debounceMs);

    const value = useMemo<GlobalSearchContextValue>(
        () => ({
            query,
            debouncedQuery,
            setQuery,
            clear: () => setQuery(''),
        }),
        [query, debouncedQuery]
    );

    return <GlobalSearchContext.Provider value={value}>{children}</GlobalSearchContext.Provider>;
}

export function useGlobalSearch() {
    const ctx = useContext(GlobalSearchContext);
    if (!ctx) {
        throw new Error('useGlobalSearch must be used within GlobalSearchProvider');
    }
    return ctx;
}

