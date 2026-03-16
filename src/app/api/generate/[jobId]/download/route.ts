import { NextRequest, NextResponse } from 'next/server';
import { getJobStatus } from '@/services/receipt-generator';
import { getZipResult } from '@/lib/storage';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    try {
        const { jobId } = await params;

        const status = await getJobStatus(jobId);

        if (!status) {
            return NextResponse.json(
                { error: 'Job not found' },
                { status: 404 }
            );
        }

        if (status.status !== 'COMPLETED') {
            return NextResponse.json(
                { error: 'Job not completed yet' },
                { status: 400 }
            );
        }

        // Retrieve ZIP from Redis cache
        const zipBuffer = await getZipResult(jobId);

        if (!zipBuffer) {
            return NextResponse.json(
                { error: 'Download expired. Please regenerate the receipts.' },
                { status: 410 } // 410 Gone
            );
        }

        // Stream ZIP directly to client
        return new NextResponse(new Uint8Array(zipBuffer), {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="receipts-${new Date().toISOString().split('T')[0]}.zip"`,
                'Content-Length': String(zipBuffer.length),
            },
        });
    } catch (error) {
        console.error('[Download API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
