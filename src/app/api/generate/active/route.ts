import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const activeJobs = await prisma.generationJob.findMany({
            where: {
                status: {
                    in: ['PENDING', 'PROCESSING']
                }
            },
            select: {
                id: true,
                status: true,
                progress: true,
                total: true,
                createdAt: true,
                transactionIds: true // just to count items
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Map to safe format (we don't need all transaction details)
        const mappedJobs = activeJobs.map(job => ({
            id: job.id,
            status: job.status,
            progress: job.progress,
            total: job.total,
            createdAt: job.createdAt,
            transactionCount: job.transactionIds.length
        }));

        return NextResponse.json(mappedJobs);
    } catch (error) {
        console.error('[Generate API] Fetch Active Jobs Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch active jobs' },
            { status: 500 }
        );
    }
}
