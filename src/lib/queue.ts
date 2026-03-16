/**
 * BullMQ Queue Infrastructure
 * 
 * Shared queue config used by both:
 * - Next.js API (producer: enqueues jobs)
 * - Worker process (consumer: processes jobs)
 * 
 * Uses BullMQ's built-in IORedis to avoid version mismatches.
 */

import { Queue } from 'bullmq';

const QUEUE_NAME = 'receipt-generation';

function getRedisConnectionOpts() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        throw new Error('REDIS_URL environment variable is required for job queue');
    }

    // Parse Redis URL into connection options for BullMQ's built-in IORedis
    const url = new URL(redisUrl);
    return {
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        password: url.password || undefined,
        username: url.username !== 'default' ? url.username : undefined,
        maxRetriesPerRequest: null as null,  // Required by BullMQ
        enableReadyCheck: false,
    };
}

let queue: Queue | null = null;

export function getQueue(): Queue {
    if (!queue) {
        queue = new Queue(QUEUE_NAME, {
            connection: getRedisConnectionOpts(),
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
                removeOnComplete: {
                    age: 86400, // Keep completed jobs for 24h
                    count: 100,
                },
                removeOnFail: {
                    age: 604800, // Keep failed jobs for 7 days
                },
            },
        });
    }
    return queue;
}

export function getRedisConnectionConfig() {
    return getRedisConnectionOpts();
}

export { QUEUE_NAME };
