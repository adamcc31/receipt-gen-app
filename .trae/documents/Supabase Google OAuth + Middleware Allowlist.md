## Scope
- Implement Google OAuth using Supabase Auth (no NextAuth) with App Router + `@supabase/ssr`.
- Add `/login` UI, `/auth/callback` code exchange route, and `middleware.ts` that enforces an email allowlist.

## 1) Auth Callback Route (`src/app/auth/callback/route.ts`)
- Create a GET route that reads `code` from query params.
- Use `createServerClient` from `@supabase/ssr` with request/response cookie bridging.
- Call `supabase.auth.exchangeCodeForSession(code)`.
- Redirect to `/` on success, or `/login?error=oauth` on failure.

## 2) Login Page UI (`src/app/login/page.tsx`)
- Add `/login` page with a “Masuk dengan Google” button.
- On click, call `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${origin}/auth/callback` } })`.
- Show friendly error banner from `?error=unauthorized|oauth`.
- Wrap `useSearchParams()` usage in a Suspense boundary to satisfy Next.js prerender rules.

## 3) Security & Whitelisting (Middleware)
- Add `middleware.ts` that runs on all dashboard routes and related API routes.
- In middleware:
  - Get the current user via `supabase.auth.getUser()`.
  - If no user: redirect to `/login`.
  - If user exists but `user.email` is not in allowlist:
    - Call `supabase.auth.signOut()` to clear session cookies.
    - Redirect to `/login?error=unauthorized`.
- Read allowlist from env: `ALLOWED_EMAILS="a@x.com,b@y.com"` (case-insensitive match).

## 4) Configuration
- Ensure env vars exist:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `ALLOWED_EMAILS`
- Ensure Supabase Google provider is enabled and Google Cloud redirect URI is set to Supabase callback (already done).

## 5) Verification
- Run `next build` to ensure no SSR/prerender issues.
- Manual flow:
  - Visit `/` → should redirect to `/login` when logged out.
  - Login with an allowed email → redirected to `/`.
  - Login with a non-allowed email → forced sign-out and redirected to `/login?error=unauthorized`.

Confirm this plan and I’ll proceed (or adjust) the implementation accordingly.