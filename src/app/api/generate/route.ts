import { NextRequest, NextResponse } from 'next/server';
import { enqueueGenerationJob } from '@/services/receipt-generator';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { transactionIds, exportPreferences } = body;

        if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
            return NextResponse.json(
                { error: 'No transaction IDs provided' },
                { status: 400 }
            );
        }

        if (!exportPreferences || !exportPreferences.formats || !Array.isArray(exportPreferences.formats)) {
            return NextResponse.json(
                { error: 'Invalid export preferences' },
                { status: 400 }
            );
        }

        // Enqueue job for async processing by the worker
        const jobId = await enqueueGenerationJob({
            transactionIds,
            exportPreferences,
        });

        // Return 202 Accepted with jobId for polling
        return NextResponse.json({ jobId }, { status: 202 });
    } catch (error) {
        console.error('[Generate API] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
