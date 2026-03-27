/**
 * Generation Worker
 * 
 * BullMQ worker that consumes receipt generation jobs from the queue.
 * Runs as a separate process from the Next.js web server.
 * 
 * Responsibilities:
 * 1. Dequeue job from Redis
 * 2. Render receipt HTML via renderToString + setContent 
 * 3. Generate PDF/JPG buffers via Puppeteer
 * 4. Create ZIP in memory
 * 5. Upload ZIP to Supabase Storage
 * 6. Update GenerationJob status in DB
 * 
 * Start: npx tsx scripts/start-worker.ts
 */

import { Worker, Job, UnrecoverableError } from 'bullmq';
import puppeteer, { Browser } from 'puppeteer';
import archiver from 'archiver';
import { execSync } from 'child_process';
import { prisma } from '@/lib/prisma';
import { getRedisConnectionConfig, QUEUE_NAME } from '@/lib/queue';
import { storeZipResult } from '@/lib/storage';
import { renderReceiptHTML } from './receipt-renderer';

// ============================================
// TYPES
// ============================================

interface JobData {
    jobId: string;
}

interface GeneratedBuffers {
    id: string;
    clientName: string;
    type: string;
    buffers: { name: string; data: Buffer }[];
}

// ============================================
// BROWSER SINGLETON
// ============================================

let browserInstance: Browser | null = null;
let browserLaunchPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
    if (browserInstance) {
        try {
            await browserInstance.version();
            return browserInstance;
        } catch {
            console.log('[Worker] Browser health check failed, recreating...');
            browserInstance = null;
        }
    }

    if (browserLaunchPromise) {
        return browserLaunchPromise;
    }

    browserLaunchPromise = launchBrowser();
    try {
        browserInstance = await browserLaunchPromise;
        return browserInstance;
    } finally {
        browserLaunchPromise = null;
    }
}

async function launchBrowser(): Promise<Browser> {
    let chromiumPath: string | undefined = process.env.PUPPETEER_EXECUTABLE_PATH;

    if (!chromiumPath) {
        const pathsToTry = ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'];
        for (const cmd of pathsToTry) {
            try {
                chromiumPath = execSync(`which ${cmd}`, { encoding: 'utf-8' }).trim();
                if (chromiumPath) {
                    console.log(`[Worker] Found ${cmd} at: ${chromiumPath}`);
                    break;
                }
            } catch {
                // continue
            }
        }
    }

    console.log('[Worker] Launching browser...');
    console.log('[Worker] Chromium path:', chromiumPath || '(bundled)');

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--disable-software-rasterizer',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--metrics-recording-only',
            '--mute-audio',
            '--no-first-run',
            '--safebrowsing-disable-auto-update',
        ],
        protocolTimeout: 300_000,
        timeout: 60_000,
        ...(chromiumPath ? { executablePath: chromiumPath } : {}),
    });

    console.log('[Worker] Browser launched successfully');
    return browser;
}

// ============================================
// FILENAME UTILITIES
// ============================================

function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_{2,}/g, '_')
        .trim();
}

function sanitizeFilenameForReceipt(filename: string): string {
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    return nameWithoutExt
        .replace(/\s+/g, '_')
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, '')
        .replace(/_{2,}/g, '_')
        .trim();
}

function generateReceiptNumber(filename: string, rowIndex: number | null | undefined): string {
    const safeFilename = sanitizeFilenameForReceipt(filename);
    const rowNum = String(rowIndex ?? 1).padStart(2, '0');
    return `${safeFilename}-${rowNum}`;
}

// ============================================
// CORE PROCESSING
// ============================================

async function processJob(job: Job<JobData>): Promise<void> {
    const { jobId } = job.data;

    console.log(`[Worker] Processing job ${jobId}`);

    // Load job from DB
    const generationJob = await prisma.generationJob.findUnique({
        where: { id: jobId },
    });

    if (!generationJob) {
        throw new Error(`GenerationJob ${jobId} not found`);
    }

    // Update status to PROCESSING
    await prisma.generationJob.update({
        where: { id: jobId },
        data: { status: 'PROCESSING' },
    });

    const { transactionIds, formats, folderStructure } = generationJob;
    const exportPreferences = { formats: formats as ('PDF' | 'JPG')[], folderStructure: folderStructure as 'FLAT_BULK' | 'GROUP_BY_FOLDER' };

    const browser = await getBrowser();
    const results: GeneratedBuffers[] = [];
    
    let cancelCheckCounter = 0;

    // Process each transaction
    for (let i = 0; i < transactionIds.length; i++) {
        // Check for cancellation every 5 items and on the first item
        if (cancelCheckCounter++ % 5 === 0) {
            const currentJobState = await prisma.generationJob.findUnique({
                where: { id: jobId },
                select: { status: true, errorMessage: true }
            });

            if (currentJobState?.status === 'FAILED' && currentJobState?.errorMessage === 'Cancelled by user') {
                console.log(`[Worker] Job ${jobId} was cancelled by user.`);
                throw new UnrecoverableError('Cancelled by user');
            }
        }

        const txId = transactionIds[i];
        const txStart = Date.now();

        console.log(`[Worker] [${jobId}] [${i + 1}/${transactionIds.length}] Processing ${txId}`);

        try {
            const result = await generateSingleReceipt(browser, txId, exportPreferences);
            results.push(result);
            console.log(`[Worker] [${jobId}] [${i + 1}/${transactionIds.length}] Done (${Date.now() - txStart}ms)`);
        } catch (err) {
            console.error(`[Worker] [${jobId}] [${i + 1}/${transactionIds.length}] Error for ${txId}:`, err);
            // Continue with remaining — failed transaction will be missing from ZIP
        }

        // Update progress in DB
        // Do not update status here if cancelled, but since we are mid-loop we just update progress
        await prisma.generationJob.update({
            where: { id: jobId },
            data: { progress: i + 1 },
        });
    }

    if (results.length === 0) {
        throw new Error('All transactions failed to generate');
    }

    // Create ZIP buffer in memory
    console.log(`[Worker] [${jobId}] Creating ZIP from ${results.length} results...`);
    const zipBuffer = await createZipBuffer(results, exportPreferences);

    // Store ZIP in Redis with 1-hour TTL
    console.log(`[Worker] [${jobId}] Caching ZIP in Redis (${(zipBuffer.length / 1024).toFixed(1)} KB)...`);
    await storeZipResult(jobId, zipBuffer);

    // Mark as completed
    await prisma.generationJob.update({
        where: { id: jobId },
        data: {
            status: 'COMPLETED',
            resultUrl: `redis:${jobId}`, // Flag indicating result is in Redis
            completedAt: new Date(),
            progress: transactionIds.length,
        },
    });

    console.log(`[Worker] [${jobId}] Job completed successfully`);
}

async function generateSingleReceipt(
    browser: Browser,
    transactionId: string,
    exportPreferences: { formats: ('PDF' | 'JPG')[]; folderStructure: string }
): Promise<GeneratedBuffers> {
    const page = await browser.newPage();

    try {
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { batch: true },
        });

        if (!transaction) {
            throw new Error(`Transaction ${transactionId} not found`);
        }

        // Render HTML directly
        const html = await renderReceiptHTML(transactionId);
        await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.setViewport({ width: 559, height: 794 });
        await page.waitForSelector('[data-receipt-root]', { timeout: 15000 });

        // Wait for fonts
        await page.evaluate(`
            (async () => {
                await Promise.race([
                    document.fonts.ready,
                    new Promise(resolve => setTimeout(resolve, 5000))
                ]);
            })();
        ` as unknown as string);

        // Auto-scale if needed
        await page.evaluate(`
            (() => {
                const root = document.querySelector('[data-receipt-root]');
                if (!root) return;
                const fits = () => root.scrollHeight <= root.clientHeight;
                if (fits()) return;
                const scales = [0.96, 0.94, 0.92, 0.9, 0.88];
                for (const scale of scales) {
                    root.style.zoom = String(scale);
                    if (fits()) return;
                }
            })();
        ` as unknown as string);

        // Build filename
        const safeClientName = sanitizeFilename(transaction.clientName);
        const currentDate = new Date().toISOString().split('T')[0];
        const [year, month, day] = currentDate.split('-');
        const transformedDate = `${day}-${month}-${year}`;
        const seqNum = String(transaction.rowIndex ?? 1).padStart(2, '0');
        const typeLabel = transaction.type;
        const gensenYearSafe =
            transaction.type === 'GENSEN' && transaction.gensenYear
                ? sanitizeFilename(transaction.gensenYear) : '';

        let baseFilename: string;
        if (transaction.type === 'GENSEN' && gensenYearSafe) {
            baseFilename = exportPreferences.folderStructure === 'GROUP_BY_FOLDER'
                ? `${seqNum}_${transformedDate}_GENSEN_${gensenYearSafe}`
                : `${seqNum}_${transformedDate}_${safeClientName}_GENSEN_${gensenYearSafe}`;
        } else if (exportPreferences.folderStructure === 'GROUP_BY_FOLDER') {
            baseFilename = `${seqNum}_${transformedDate}_${typeLabel}`;
        } else {
            baseFilename = `${seqNum}_${transformedDate}_${safeClientName}_${typeLabel}`;
        }

        // Generate buffers
        const { formats } = exportPreferences;
        const buffers: { name: string; data: Buffer }[] = [];

        if (formats.includes('PDF')) {
            const pdfBuffer = await page.pdf({
                format: 'A5',
                printBackground: true,
                margin: { top: 0, right: 0, bottom: 0, left: 0 },
                pageRanges: '1',
                preferCSSPageSize: true,
            });
            buffers.push({ name: `${baseFilename}.pdf`, data: Buffer.from(pdfBuffer) });
        }

        if (formats.includes('JPG')) {
            const jpgBuffer = await page.screenshot({
                type: 'jpeg',
                quality: 90,
                fullPage: false,
                clip: { x: 0, y: 0, width: 559, height: 794 },
            });
            buffers.push({ name: `${baseFilename}.jpg`, data: Buffer.from(jpgBuffer) });
        }

        // Update transaction status
        const rawName = transaction.batch?.filename || 'MANUAL_UPLOAD';
        const receiptNumber = generateReceiptNumber(rawName, transaction.rowIndex);

        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: 'GENERATED',
                generatedAt: new Date(),
                receiptNumber,
                pdfPath: formats.includes('PDF') ? `/receipts/${baseFilename}.pdf` : null,
                imagePath: formats.includes('JPG') ? `/receipts/${baseFilename}.jpg` : null,
            },
        });

        return {
            id: transactionId,
            clientName: transaction.clientName,
            type: transaction.type,
            buffers,
        };
    } finally {
        await page.close();
    }
}

// ============================================
// ZIP CREATION
// ============================================

function createZipBuffer(
    results: GeneratedBuffers[],
    preferences: { folderStructure: string }
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        const archive = archiver('zip', { zlib: { level: 6 } });

        archive.on('data', (chunk: Buffer) => chunks.push(chunk));
        archive.on('end', () => resolve(Buffer.concat(chunks)));
        archive.on('error', reject);

        for (const result of results) {
            for (const buf of result.buffers) {
                const archivePath = preferences.folderStructure === 'GROUP_BY_FOLDER'
                    ? `${sanitizeFilename(result.clientName)}/${buf.name}`
                    : buf.name;
                archive.append(buf.data, { name: archivePath });
            }
        }

        archive.finalize();
    });
}

// ============================================
// WORKER STARTUP
// ============================================

export function startWorker(): Worker {
    const worker = new Worker<JobData>(
        QUEUE_NAME,
        async (job) => {
            try {
                await processJob(job);
            } catch (err) {
                const jobId = job.data.jobId;
                console.error(`[Worker] Job ${jobId} failed:`, err);

                // Update job status in DB
                await prisma.generationJob.update({
                    where: { id: jobId },
                    data: {
                        status: 'FAILED',
                        errorMessage: err instanceof Error ? err.message : 'Unknown error',
                    },
                }).catch((dbErr: unknown) => {
                    console.error(`[Worker] Failed to update job status:`, dbErr);
                });

                throw err; // Re-throw so BullMQ handles retries
            }
        },
        {
            connection: getRedisConnectionConfig(),
            concurrency: 1, // One job at a time (single Chromium instance)
        }
    );

    worker.on('completed', (job) => {
        console.log(`[Worker] Job ${job.data.jobId} completed`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[Worker] Job ${job?.data.jobId} failed after ${job?.attemptsMade} attempts:`, err.message);
    });

    worker.on('error', (err) => {
        console.error('[Worker] Worker error:', err);
    });

    console.log('[Worker] Worker started, waiting for jobs...');
    return worker;
}
