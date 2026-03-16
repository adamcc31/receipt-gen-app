/**
 * Receipt Generator Service — Job Producer
 * 
 * This module is a thin producer that:
 * 1. Creates a GenerationJob record in PostgreSQL
 * 2. Enqueues the job to BullMQ (Redis)
 * 3. Returns the jobId for client polling
 * 
 * All Puppeteer/rendering logic has been moved to generation-worker.ts
 * which runs as a separate process.
 */

import { prisma } from '@/lib/prisma';
import { getQueue } from '@/lib/queue';

// ============================================
// TYPES
// ============================================

export interface ExportPreferences {
    formats: ('PDF' | 'JPG')[];
    folderStructure: 'FLAT_BULK' | 'GROUP_BY_FOLDER';
}

export interface GenerateOptions {
    transactionIds: string[];
    exportPreferences: ExportPreferences;
}

// ============================================
// JOB PRODUCER
// ============================================

/**
 * Create a generation job and enqueue it for the worker.
 * Returns the jobId for status polling.
 */
export async function enqueueGenerationJob(options: GenerateOptions): Promise<string> {
    const { transactionIds, exportPreferences } = options;

    // 1. Create persistent job record in PostgreSQL
    const generationJob = await prisma.generationJob.create({
        data: {
            transactionIds,
            formats: exportPreferences.formats,
            folderStructure: exportPreferences.folderStructure,
            total: transactionIds.length,
        },
    });

    console.log(`[Generator] Created job ${generationJob.id} for ${transactionIds.length} transactions`);

    // 2. Enqueue to BullMQ for the worker to pick up
    const queue = getQueue();
    await queue.add('generate', { jobId: generationJob.id }, {
        jobId: generationJob.id, // Use same ID for deduplication
    });

    console.log(`[Generator] Job ${generationJob.id} enqueued to Redis`);

    return generationJob.id;
}

/**
 * Get job status from the database.
 */
export async function getJobStatus(jobId: string) {
    const job = await prisma.generationJob.findUnique({
        where: { id: jobId },
    });

    if (!job) {
        return null;
    }

    return {
        status: job.status,
        progress: job.total > 0 ? Math.round((job.progress / job.total) * 100) : 0,
        total: job.total,
        completed: job.progress,
        errorMessage: job.errorMessage,
        resultUrl: job.resultUrl,
    };
}
