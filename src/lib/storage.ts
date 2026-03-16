/**
 * Redis ZIP Cache
 * 
 * Stores generated ZIP buffers temporarily in Redis with automatic expiry.
 * Replaces Supabase Storage — no external blob storage needed.
 * 
 * ZIP buffers are stored as base64 strings with a 1-hour TTL.
 * After download or expiry, the data is automatically cleaned up.
 */

import { getRedisConnectionConfig } from './queue';
import IORedis from 'ioredis';

let storageRedis: IORedis | null = null;

function getStorageRedis(): IORedis {
    if (!storageRedis) {
        const config = getRedisConnectionConfig();
        storageRedis = new IORedis({
            host: config.host,
            port: config.port,
            password: config.password,
            username: config.username,
        });
    }
    return storageRedis;
}

const KEY_PREFIX = 'zip-result:';
const DEFAULT_TTL_SECONDS = 3600; // 1 hour

/**
 * Store a ZIP buffer in Redis with automatic expiry.
 */
export async function storeZipResult(
    jobId: string,
    zipBuffer: Buffer,
    ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> {
    const redis = getStorageRedis();
    const key = `${KEY_PREFIX}${jobId}`;
    
    await redis.set(key, zipBuffer.toString('base64'), 'EX', ttlSeconds);

    console.log(`[Storage] Stored ZIP for job ${jobId} in Redis (${(zipBuffer.length / 1024).toFixed(1)} KB, TTL: ${ttlSeconds}s)`);
}

/**
 * Retrieve a ZIP buffer from Redis.
 * Returns null if expired or not found.
 */
export async function getZipResult(jobId: string): Promise<Buffer | null> {
    const redis = getStorageRedis();
    const key = `${KEY_PREFIX}${jobId}`;

    const data = await redis.get(key);
    if (!data) {
        return null;
    }

    return Buffer.from(data, 'base64');
}

/**
 * Delete a ZIP buffer from Redis (cleanup after download).
 */
export async function deleteZipResult(jobId: string): Promise<void> {
    const redis = getStorageRedis();
    const key = `${KEY_PREFIX}${jobId}`;
    await redis.del(key);
}
