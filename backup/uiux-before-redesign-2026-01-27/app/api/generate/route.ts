import { NextRequest, NextResponse } from 'next/server';
import { generateReceipts } from '@/services/receipt-generator';

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

        // Validate export preferences
        if (!exportPreferences || !exportPreferences.formats || !Array.isArray(exportPreferences.formats)) {
            return NextResponse.json(
                { error: 'Invalid export preferences' },
                { status: 400 }
            );
        }

        // Get base URL from request
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const host = request.headers.get('host') || 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;

        // Start generation job with export preferences
        const jobId = await generateReceipts({
            transactionIds,
            baseUrl,
            exportPreferences,
        });

        return NextResponse.json({ jobId });
    } catch (error) {
        console.error('Generate error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
