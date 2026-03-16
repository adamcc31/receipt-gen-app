import DashboardLayoutClient from './DashboardLayoutClient';
import ClientAuthGuard from '@/components/auth/ClientAuthGuard';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // The authentication and whitelist checks have been moved 100% to Client Side 
    // to permanently bypass Next.js 15+ turbopack cookie caching bugs.
    
    return (
        <ClientAuthGuard>
            <DashboardLayoutClient>{children}</DashboardLayoutClient>
        </ClientAuthGuard>
    );
}
