## Kondisi Saat Ini (Audit Cepat)
- Redirect ke `/login` untuk rute dashboard sudah berjalan via middleware matcher, dan whitelist email sudah dicek melalui `user.email`.
- Celah utama: rute `/render/...` belum diproteksi (renderer baca Prisma langsung) dan generator PDF (Puppeteer) saat ini mengakses `/render` tanpa cookies.
- UI header masih menampilkan menu Profile/Preferences (placeholder) dan Logout masih “UI-only”.

## Target Utama
- User belum login → tidak bisa akses halaman/data/API internal sama sekali.
- Whitelist email dari ENV wajib, user non-allowlist dipaksa sign-out.
- Login/Logout flow stabil: refresh, direct URL, token expired, multi-tab.
- UI `/login` simpel, rapi, hanya Google OAuth.

## 1) Enforcement Auth (Server-side, bukan client check)
- Perluas proteksi middleware agar mencakup **semua** rute internal yang sensitif, termasuk:
  - `/render/:path*` (renderer)
  - seluruh dashboard routes (sudah)
  - seluruh API internal (sudah, tetap diaudit)
- Pastikan rute publik yang tetap terbuka:
  - `/login`
  - `/auth/callback`
  - `/_next`, assets, favicon

## 2) Amankan `/render` Tanpa Merusak Generator
Karena generator PDF memakai Puppeteer tanpa cookies, kita tidak bisa langsung mewajibkan session untuk `/render` tanpa penyesuaian.
- Tambah env secret baru misalnya `RENDER_INTERNAL_TOKEN`.
- Update middleware:
  - Jika path `/render/...`:
    - Izinkan akses **hanya** bila request memiliki header `x-render-token` yang cocok dengan `RENDER_INTERNAL_TOKEN` **atau** user sudah login & allowlisted.
    - Selain itu redirect ke `/login`.
- Update receipt generator:
  - Sebelum `page.goto(renderUrl)` set header `x-render-token: process.env.RENDER_INTERNAL_TOKEN`.

Hasil: user publik tidak bisa akses `/render`, tapi generator tetap bisa merender PDF secara aman.

## 3) Audit & Penyederhanaan Fitur yang Belum Siap
- Hilangkan dari UI (bukan toast placeholder):
  - Profile
  - Preferences
- Implement Logout yang benar (agar memenuhi audit):
  - Client-side `supabase.auth.signOut()` lalu `router.replace('/login')`.
  - Setelah logout, refresh/direct URL ke halaman protected harus kembali ke `/login`.
- Opsional: tampilkan email user yang login di header (diambil dari Supabase) supaya state login terlihat konsisten.

## 4) Perbaikan UI/UX Halaman `/login`
- Buat login page lebih “tegas” dan minimal:
  - Branding (nama aplikasi + icon/logo ringan)
  - 1 tombol “Login with Google”
  - Loading & error state yang jelas
- Tambah server-side redirect: kalau user sudah login, akses `/login` langsung diarahkan ke `/`.

## 5) Verifikasi End-to-End
- Build: `next build` harus lolos.
- Manual test matrix:
  - Logged out → akses `/`, `/batches`, `/api/...`, `/render/...` → redirect `/login`.
  - Login allowlisted → akses normal.
  - Login non-allowlisted → otomatis signOut + `/login?error=unauthorized`.
  - Expired session → refresh → kembali `/login`.
  - Logout → tidak bisa akses protected page, termasuk via refresh.

Jika plan ini disetujui, saya akan mengerjakan perubahan pada middleware, receipt generator, UI header (hapus placeholder + logout real), dan polish login UI + server redirect.