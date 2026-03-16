import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    if (!code) {
        return NextResponse.redirect(`${origin}/login?error=no_code`);
    }

    const forwardedHost = request.headers.get('x-forwarded-host');
    const isLocalEnv = process.env.NODE_ENV === 'development';
    const redirectUrl = !isLocalEnv && forwardedHost
        ? `https://${forwardedHost}${next}`
        : `${origin}${next}`;

    const response = NextResponse.redirect(redirectUrl, 303);

    // Promise flusher untuk mengunci Event Loop hingga webhook setAll beres
    let resolveCookies: () => void = () => {};
    const cookiesFlushed = new Promise<void>((res) => { resolveCookies = res; });

    const reqCookies = request.cookies.getAll();
    console.log('[Callback] request cookies:', reqCookies.map(c => c.name).join(', '));

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    console.log('[Callback] setAll called -', cookiesToSet.length, 'cookies');
                    cookiesToSet.forEach(({ name, value, options }) => {
                        console.log(`[Callback] → ${name} maxAge:${options?.maxAge}`);
                        response.cookies.set(name, value, {
                            ...options,
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: 'lax',
                        });
                    });
                    // Memberikan sinyal bahwa cookie telah direkatkan
                    resolveCookies();
                },
            },
        }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    // [VITAL WORKAROUND]
    // @supabase/ssr menangani `setAll` secara ASINKRON di antrean Event Loop berikutnya
    // SETELAH promise auth.exchangeCodeForSession memanggil resolusinya.
    // Jika kita tidak menunggu, Next.js mereturn respons yang 100% kosong dari cookie.
    await Promise.race([cookiesFlushed, new Promise(r => setTimeout(r, 200))]);

    console.log('[Callback] exchange error:', error?.message ?? 'NONE');
    console.log('[Callback] user:', data?.user?.email ?? 'null');
    console.log('[Callback] cookies on response:', response.cookies.getAll().map(c => c.name).join(', '));

    if (!error) {
        return response;
    }

    return NextResponse.redirect(`${origin}/login?error=oauth`);
}