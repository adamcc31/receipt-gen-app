import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ jobId: string }> }
) {
    const params = await props.params;
    try {
        const { jobId } = params;
        
        const job = await prisma.generationJob.findUnique({
            where: { id: jobId }
        });
        
        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
        
        if (job.status === 'COMPLETED' || job.status === 'FAILED') {
            return NextResponse.json({ message: 'Job already finished' });
        }
        
        await prisma.generationJob.update({
            where: { id: jobId },
            data: { 
                status: 'FAILED',
                errorMessage: 'Cancelled by user'
            }
        });
        
        return NextResponse.json({ message: 'Job cancelled successfully' });
    } catch (error) {
        console.error('[Generate API] Cancel Error:', error);
        return NextResponse.json(
            { error: 'Failed to cancel job' },
            { status: 500 }
        );
    }
}
