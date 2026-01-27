import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import LoginClient from './LoginClient';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function LoginPage() {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user) {
        redirect('/');
    }

    return (
        <Suspense>
            <LoginClient />
        </Suspense>
    );
}
