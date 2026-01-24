/**
 * Receipt Generator Service
 * 
 * Uses Puppeteer to generate PDF and JPEG files from receipt templates.
 * Implements concurrency control to avoid memory issues.
 * Supports dynamic export preferences (formats and folder structures).
 */

import puppeteer, { Browser } from 'puppeteer';
import { prisma } from '@/lib/prisma';
import archiver from 'archiver';
import { createWriteStream, mkdirSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';

// Store active jobs in memory
export const activeJobs = new Map<string, JobStatus>();

export interface JobStatus {
    id: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    progress: number;
    total: number;
    outputPath?: string;
    error?: string;
}

export interface ExportPreferences {
    formats: ('PDF' | 'JPG')[];
    folderStructure: 'FLAT_BULK' | 'GROUP_BY_FOLDER';
}

export interface GenerateOptions {
    transactionIds: string[];
    baseUrl: string;
    exportPreferences: ExportPreferences;
}

// Concurrency control
const MAX_CONCURRENT_PAGES = 5;
let activePagesCount = 0;

async function waitForAvailableSlot(): Promise<void> {
    while (activePagesCount >= MAX_CONCURRENT_PAGES) {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
}

/**
 * Sanitize filename/folder name to remove invalid characters
 */
function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_{2,}/g, '_')
        .trim();
}

/**
 * Sanitize filename for Receipt Number
 * Remove extension, replace spaces with _, uppercase, remove ugly special chars
 */
function sanitizeFilenameForReceipt(filename: string): string {
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    return nameWithoutExt
        .replace(/\s+/g, '_')
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, '')
        .replace(/_{2,}/g, '_')
        .trim();
}

/**
 * Generate receipt number based on filename and row index
 * Format: [CLEAN_FILENAME]-[ROW_INDEX]
 */
function generateReceiptNumber(filename: string, rowIndex: number | null | undefined): string {
    const safeFilename = sanitizeFilenameForReceipt(filename);
    const rowNum = String(rowIndex ?? 1).padStart(2, '0');
    return `${safeFilename}-${rowNum}`;
}

/**
 * Generate receipts for given transaction IDs
 */
export async function generateReceipts(options: GenerateOptions): Promise<string> {
    const { transactionIds, baseUrl, exportPreferences } = options;
    const jobId = uuidv4();

    console.log(`[Generator] Starting job ${jobId} for ${transactionIds.length} transactions`);
    console.log(`[Generator] Export preferences:`, exportPreferences);

    // Initialize job
    activeJobs.set(jobId, {
        id: jobId,
        status: 'PENDING',
        progress: 0,
        total: transactionIds.length,
    });

    // Start generation in background (don't await)
    processGenerationJob(jobId, transactionIds, baseUrl, exportPreferences).catch((error) => {
        console.error(`[Generator] Job ${jobId} failed:`, error);
        const job = activeJobs.get(jobId);
        if (job) {
            job.status = 'FAILED';
            job.error = error.message;
        }
    });

    return jobId;
}

async function processGenerationJob(
    jobId: string,
    transactionIds: string[],
    baseUrl: string,
    exportPreferences: ExportPreferences
): Promise<void> {
    const job = activeJobs.get(jobId);
    if (!job) return;

    console.log(`[Generator] Processing job ${jobId}`);
    job.status = 'PROCESSING';

    // Create output directory
    const outputDir = join(process.cwd(), 'public', 'receipts', jobId);
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }

    let browser: Browser | null = null;

    try {
        // Detect Chromium path dynamically
        let chromiumPath: string | undefined = process.env.PUPPETEER_EXECUTABLE_PATH;

        if (!chromiumPath) {
            // Try to find chromium using 'which' command
            const pathsToTry = ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'];
            for (const cmd of pathsToTry) {
                try {
                    chromiumPath = execSync(`which ${cmd}`, { encoding: 'utf-8' }).trim();
                    if (chromiumPath) {
                        console.log(`[Generator] Found ${cmd} at: ${chromiumPath}`);
                        break;
                    }
                } catch {
                    // Command not found, try next
                }
            }
        }

        // Also try common hardcoded paths as fallback
        const fallbackPaths = [
            '/nix/store/*/bin/chromium',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
        ];

        console.log('[Generator] Launching Puppeteer browser...');
        console.log('[Generator] Detected chromiumPath:', chromiumPath);

        const launchArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process',
            '--no-zygote',
            '--disable-software-rasterizer',
        ];

        // Try with detected path first
        if (chromiumPath) {
            try {
                console.log(`[Generator] Trying detected path: ${chromiumPath}`);
                browser = await puppeteer.launch({
                    headless: true,
                    executablePath: chromiumPath,
                    args: launchArgs,
                });
                console.log(`[Generator] Browser launched successfully with: ${chromiumPath}`);
            } catch (err) {
                console.error(`[Generator] Failed with detected path:`, err);
            }
        }

        // If detected path failed, try fallback paths
        if (!browser) {
            for (const fallbackPath of fallbackPaths) {
                if (fallbackPath.includes('*')) continue; // Skip glob patterns
                try {
                    console.log(`[Generator] Trying fallback path: ${fallbackPath}`);
                    browser = await puppeteer.launch({
                        headless: true,
                        executablePath: fallbackPath,
                        args: launchArgs,
                    });
                    console.log(`[Generator] Browser launched with fallback: ${fallbackPath}`);
                    break;
                } catch (err) {
                    console.error(`[Generator] Failed with fallback ${fallbackPath}:`, err);
                }
            }
        }

        // Last resort: try bundled Chromium
        if (!browser) {
            console.log('[Generator] Trying with bundled Chromium...');
            try {
                browser = await puppeteer.launch({
                    headless: true,
                    args: launchArgs,
                });
                console.log('[Generator] Browser launched with bundled Chromium');
            } catch (err) {
                console.error('[Generator] Bundled Chromium also failed:', err);
                throw new Error(`Failed to launch browser. Detected path: ${chromiumPath}. Error: ${err}`);
            }
        }

        if (!browser) {
            throw new Error('Failed to launch browser: no valid Chromium path found');
        }

        console.log('[Generator] Browser ready');

        // Process transactions with concurrency control
        const results = [];
        for (let i = 0; i < transactionIds.length; i++) {
            const txId = transactionIds[i];
            console.log(`[Generator] Processing transaction ${i + 1}/${transactionIds.length}: ${txId}`);

            await waitForAvailableSlot();
            activePagesCount++;

            try {
                const result = await generateSingleReceipt(
                    browser,
                    txId,
                    baseUrl,
                    outputDir,
                    exportPreferences
                );
                results.push(result);

                // Update progress
                job.progress = Math.round(((i + 1) / transactionIds.length) * 100);
                console.log(`[Generator] Progress: ${job.progress}%`);
            } finally {
                activePagesCount--;
            }
        }

        // Create ZIP archive
        const zipPath = join(outputDir, 'receipts.zip');
        await createZipArchive(outputDir, zipPath, results, exportPreferences);

        // Update job status
        job.status = 'COMPLETED';
        job.progress = 100;
        job.outputPath = `/receipts/${jobId}/receipts.zip`;

        console.log(`[Generator] Job ${jobId} completed successfully`);

    } catch (error) {
        console.error(`[Generator] Job ${jobId} error:`, error);
        job.status = 'FAILED';
        job.error = error instanceof Error ? error.message : 'Unknown error';
        throw error;
    } finally {
        if (browser) {
            console.log('[Generator] Closing browser...');
            await browser.close();
        }
    }
}

interface GeneratedFile {
    id: string;
    clientName: string;
    type: string;
    date: string;
    files: string[];
}

async function generateSingleReceipt(
    browser: Browser,
    transactionId: string,
    baseUrl: string,
    outputDir: string,
    exportPreferences: ExportPreferences
): Promise<GeneratedFile> {
    const page = await browser.newPage();

    try {
        // Get transaction data
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { batch: true },
        });

        if (!transaction) {
            throw new Error(`Transaction ${transactionId} not found`);
        }

        // Sanitize client name for filename/folder
        const safeClientName = sanitizeFilename(transaction.clientName);
        const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const typeLabel = transaction.type;

        // Determine the route based on type
        const renderType = transaction.type.startsWith('NENKIN') ? 'nenkin' : 'gensen';
        const renderUrl = `${baseUrl}/render/${renderType}/${transactionId}`;
        console.log(`[Generator] Rendering: ${renderUrl}`);

        const internalRenderToken = process.env.RENDER_INTERNAL_TOKEN;
        if (internalRenderToken) {
            await page.setExtraHTTPHeaders({ 'x-render-token': internalRenderToken });
        }

        await page.goto(renderUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Set viewport for A5 size (559px x 794px at 96dpi)
        await page.setViewport({ width: 559, height: 794 });

        await page.waitForSelector('[data-receipt-root]', { timeout: 30000 });
        const appliedScale = await page.evaluate(() => {
            const root = document.querySelector('[data-receipt-root]') as HTMLElement | null;
            if (!root) return 1;
            const fits = () => root.scrollHeight <= root.clientHeight;
            if (fits()) return 1;
            const scales = [0.96, 0.94, 0.92, 0.9, 0.88];
            for (const scale of scales) {
                root.style.zoom = String(scale);
                if (fits()) return scale;
            }
            return scales[scales.length - 1];
        });
        if (appliedScale !== 1) {
            console.log(`[Generator] Applied A5 auto-scale: ${appliedScale}`);
        }

        const generatedFiles: string[] = [];
        const { formats, folderStructure } = exportPreferences;

        // Determine target directory based on folder structure
        let targetDir = outputDir;
        if (folderStructure === 'GROUP_BY_FOLDER') {
            targetDir = join(outputDir, safeClientName);
            if (!existsSync(targetDir)) {
                mkdirSync(targetDir, { recursive: true });
            }
        }

        // Determine filename based on folder structure
        let baseFilename: string;
        const gensenYearSafe =
            transaction.type === 'GENSEN' && transaction.gensenYear
                ? sanitizeFilename(transaction.gensenYear)
                : '';

        if (transaction.type === 'GENSEN' && gensenYearSafe) {
            if (folderStructure === 'GROUP_BY_FOLDER') {
                // Format: Date_GENSEN_Year.ext
                baseFilename = `${currentDate}_GENSEN_${gensenYearSafe}`;
            } else {
                // Format: Date_ClientName_GENSEN_Year.ext
                baseFilename = `${currentDate}_${safeClientName}_GENSEN_${gensenYearSafe}`;
            }
        } else if (folderStructure === 'GROUP_BY_FOLDER') {
            // Format: Date_Type.ext
            baseFilename = `${currentDate}_${typeLabel}`;
        } else {
            // Format: Date_ClientName_Type.ext
            baseFilename = `${currentDate}_${safeClientName}_${typeLabel}`;
        }

        // Generate PDF if requested
        if (formats.includes('PDF')) {
            const pdfPath = join(targetDir, `${baseFilename}.pdf`);
            await page.pdf({
                path: pdfPath,
                format: 'A5',
                printBackground: true,
                margin: { top: 0, right: 0, bottom: 0, left: 0 },
                pageRanges: '1',  // Force single page
                preferCSSPageSize: true,
            });
            generatedFiles.push(pdfPath);
            console.log(`[Generator] Generated PDF: ${pdfPath}`);
        }

        // Generate JPG if requested
        if (formats.includes('JPG')) {
            const jpgPath = join(targetDir, `${baseFilename}.jpg`);
            await page.screenshot({
                path: jpgPath,
                type: 'jpeg',
                quality: 90,
                fullPage: false,
                clip: { x: 0, y: 0, width: 559, height: 794 },  // Exact A5 dimensions
            });
            generatedFiles.push(jpgPath);
            console.log(`[Generator] Generated JPG: ${jpgPath}`);
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
            date: currentDate,
            files: generatedFiles,
        };
    } finally {
        await page.close();
    }
}

async function createZipArchive(
    outputDir: string,
    zipPath: string,
    results: GeneratedFile[],
    exportPreferences: ExportPreferences
): Promise<void> {
    console.log('[Generator] Creating ZIP archive');

    return new Promise((resolve, reject) => {
        const output = createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            console.log(`[Generator] ZIP archive created: ${archive.pointer()} bytes`);

            // Clean up individual files and folders (keep only ZIP)
            if (exportPreferences.folderStructure === 'GROUP_BY_FOLDER') {
                // Remove client folders
                const clientFolders = new Set(results.map(r => sanitizeFilename(r.clientName)));
                clientFolders.forEach(folder => {
                    const folderPath = join(outputDir, folder);
                    if (existsSync(folderPath)) {
                        rmSync(folderPath, { recursive: true, force: true });
                    }
                });
            } else {
                // Remove individual files
                results.forEach(result => {
                    result.files.forEach(file => {
                        if (existsSync(file)) {
                            rmSync(file, { force: true });
                        }
                    });
                });
            }

            resolve();
        });

        archive.on('error', (err) => {
            console.error('[Generator] ZIP error:', err);
            reject(err);
        });

        archive.pipe(output);

        // Add files to archive based on folder structure
        if (exportPreferences.folderStructure === 'GROUP_BY_FOLDER') {
            // Add files with folder structure preserved
            for (const result of results) {
                const clientFolder = sanitizeFilename(result.clientName);
                for (const filePath of result.files) {
                    const filename = filePath.split(/[/\\]/).pop() || 'file';
                    archive.file(filePath, { name: `${clientFolder}/${filename}` });
                }
            }
        } else {
            // Add all files flat to ZIP root
            for (const result of results) {
                for (const filePath of result.files) {
                    const filename = filePath.split(/[/\\]/).pop() || 'file';
                    archive.file(filePath, { name: filename });
                }
            }
        }

        archive.finalize();
    });
}

/**
 * Get job status
 */
export function getJobStatus(jobId: string): JobStatus | null {
    const status = activeJobs.get(jobId) || null;
    if (status) {
        console.log(`[Generator] Status check for ${jobId}: ${status.status} (${status.progress}%)`);
    }
    return status;
}
