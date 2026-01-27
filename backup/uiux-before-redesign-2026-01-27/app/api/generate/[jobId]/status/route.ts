import { NextRequest, NextResponse } from 'next/server';
import { getJobStatus } from '@/services/receipt-generator';

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

    return NextResponse.json(status);
}
