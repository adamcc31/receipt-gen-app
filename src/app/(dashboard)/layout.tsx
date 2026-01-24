import DashboardLayoutClient from './DashboardLayoutClient';

// Force dynamic rendering - prevents static prerendering during build
// when Supabase env vars aren't available
export const dynamic = 'force-dynamic';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
