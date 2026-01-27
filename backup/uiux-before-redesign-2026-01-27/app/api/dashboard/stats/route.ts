import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const [totalTransactions, generatedTransactions, draftTransactions, distinctBatches] = await Promise.all([
            prisma.transaction.count(),
            prisma.transaction.count({ where: { status: 'GENERATED' } }),
            prisma.transaction.count({ where: { status: 'DRAFT' } }),
            prisma.transaction.findMany({ distinct: ['batchId'], select: { batchId: true } }),
        ]);

        return NextResponse.json({
            totalBatches: distinctBatches.length,
            totalTransactions,
            generatedTransactions,
            pendingTransactions: draftTransactions,
        });
    } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

