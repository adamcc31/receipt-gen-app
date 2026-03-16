/**
 * Worker Entry Point
 * 
 * Starts the BullMQ generation worker as a standalone process.
 * Handles graceful shutdown on SIGTERM/SIGINT.
 * 
 * Usage: npx tsx scripts/start-worker.ts
 */

import 'dotenv/config';

async function main() {
    console.log('[Worker] Starting receipt generation worker...');
    console.log('[Worker] Redis URL:', process.env.REDIS_URL ? '(configured)' : '(MISSING!)');

    if (!process.env.REDIS_URL) {
        console.error('[Worker] FATAL: REDIS_URL environment variable is required');
        process.exit(1);
    }

    // Dynamic import to ensure env is loaded first
    const { startWorker } = await import('../src/services/generation-worker');

    const worker = startWorker();

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        console.log(`[Worker] Received ${signal}, shutting down gracefully...`);
        await worker.close();
        console.log('[Worker] Worker stopped');
        process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    console.log('[Worker] Worker is ready and listening for jobs');
}

main().catch((err) => {
    console.error('[Worker] Fatal error:', err);
    process.exit(1);
});
