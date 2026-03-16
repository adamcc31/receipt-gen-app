import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        console.log(`[SupabaseServerClient] setAll called with ${cookiesToSet.length} cookies.`);
                        cookiesToSet.forEach(({ name, value, options }) => {
                            console.log(`[SupabaseServerClient] Setting cookie: ${name} = ${value ? value.substring(0, 15) + '...' : 'EMPTY'} (maxAge: ${options.maxAge})`);
                            cookieStore.set(name, value, {
                                ...options,
                                secure: process.env.NODE_ENV === 'production',
                                sameSite: 'lax',
                            });
                        });
                    } catch (error) {
                        console.error('[SupabaseServerClient] Failed to setAll cookies (Expected during SSR):', error instanceof Error ? error.message : String(error));
                    }
                },
            },
        }
    );
}

