import { NextRequest, NextResponse } from 'next/server';
import { getJobStatus } from '@/services/receipt-generator';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const { jobId } = await params;

    const status = getJobStatus(jobId);

    if (!status) {
        return NextResponse.json(
            { error: 'Job not found' },
            { status: 404 }
        );
    }

    if (status.status !== 'COMPLETED' || !status.outputPath) {
        return NextResponse.json(
            { error: 'Job not completed yet' },
            { status: 400 }
        );
    }

    // Read the ZIP file
    const zipPath = join(process.cwd(), 'public', status.outputPath);

    if (!existsSync(zipPath)) {
        return NextResponse.json(
            { error: 'File not found' },
            { status: 404 }
        );
    }

    const fileBuffer = readFileSync(zipPath);

    return new NextResponse(fileBuffer, {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="receipts-${jobId}.zip"`,
        },
    });
}
