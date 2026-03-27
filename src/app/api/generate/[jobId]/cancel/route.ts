import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getQueue } from '@/lib/queue';

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
        
        // 1. Mark as FAILED in database
        await prisma.generationJob.update({
            where: { id: jobId },
            data: { 
                status: 'FAILED',
                errorMessage: 'Cancelled by user'
            }
        });
        
        // 2. Remove the job from BullMQ Redis queue so worker can't pick it up
        const queue = getQueue();
        try {
            const bullJob = await queue.getJob(jobId);
            if (bullJob) {
                await bullJob.remove();
                console.log(`[Cancel API] Removed BullMQ job ${jobId} from queue`);
            }
        } catch (queueErr) {
            // Job might be actively processing (locked), that's OK — 
            // the worker loop will catch the DB status change
            console.log(`[Cancel API] Could not remove BullMQ job ${jobId} (may be active):`, queueErr);
        }
        
        // 3. Also cancel all other PENDING jobs in the DB and remove them from the queue
        const pendingJobs = await prisma.generationJob.findMany({
            where: { status: 'PENDING' }
        });
        
        if (pendingJobs.length > 0) {
            await prisma.generationJob.updateMany({
                where: { status: 'PENDING' },
                data: { 
                    status: 'FAILED',
                    errorMessage: 'Cancelled by user'
                }
            });
            
            // Remove each pending job from BullMQ queue
            for (const pendingJob of pendingJobs) {
                try {
                    const bullJob = await queue.getJob(pendingJob.id);
                    if (bullJob) {
                        await bullJob.remove();
                        console.log(`[Cancel API] Removed pending BullMQ job ${pendingJob.id}`);
                    }
                } catch {
                    // Ignore removal errors for pending jobs
                }
            }
            
            console.log(`[Cancel API] Cancelled ${pendingJobs.length} pending jobs`);
        }
        
        return NextResponse.json({ message: 'Job cancelled successfully' });
    } catch (error) {
        console.error('[Generate API] Cancel Error:', error);
        return NextResponse.json(
            { error: 'Failed to cancel job' },
            { status: 500 }
        );
    }
}
