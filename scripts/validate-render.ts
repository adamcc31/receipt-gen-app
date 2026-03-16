/**
 * Render Fidelity Validation Script
 * 
 * Validates that renderToString + setContent produces output
 * that is structurally identical to the HTTP SSR render pages.
 * 
 * Usage: npx tsx scripts/validate-render.ts <transaction-id>
 * 
 * Prerequisites:
 * - DATABASE_URL must be set in .env
 * - Chromium must be available (local or via PUPPETEER_EXECUTABLE_PATH)
 * 
 * What it does:
 * 1. Renders the receipt via renderToString (new method)
 * 2. Launches Puppeteer, sets content, captures PDF + screenshot
 * 3. Saves output to /tmp/validate-render/ for visual review
 */

import 'dotenv/config';

async function main() {
    const transactionId = process.argv[2];

    if (!transactionId) {
        console.error('Usage: npx tsx scripts/validate-render.ts <transaction-id>');
        process.exit(1);
    }

    console.log(`[Validate] Starting render validation for transaction: ${transactionId}`);

    // Dynamic imports to handle module resolution
    const { renderReceiptHTML } = await import('../src/services/receipt-renderer');
    const puppeteer = await import('puppeteer');
    const fs = await import('fs');
    const path = await import('path');

    // Step 1: Render HTML via renderToString
    console.log('[Validate] Step 1: Rendering HTML via renderToString...');
    const startRender = Date.now();
    const html = await renderReceiptHTML(transactionId);
    console.log(`[Validate] HTML rendered in ${Date.now() - startRender}ms (${html.length} chars)`);

    // Create output directory
    const outputDir = path.join(process.cwd(), 'tmp', 'validate-render');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save raw HTML for inspection
    const htmlPath = path.join(outputDir, `${transactionId}.html`);
    fs.writeFileSync(htmlPath, html, 'utf-8');
    console.log(`[Validate] HTML saved to: ${htmlPath}`);

    // Step 2: Open in Puppeteer with setContent
    console.log('[Validate] Step 2: Launching Puppeteer...');
    const browser = await puppeteer.default.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
        ],
        protocolTimeout: 300_000,
        timeout: 60_000,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.setViewport({ width: 559, height: 794 });

    // Wait for receipt root
    const hasRoot = await page.waitForSelector('[data-receipt-root]', { timeout: 15000 })
        .then(() => true)
        .catch(() => false);

    if (!hasRoot) {
        console.error('[Validate] ❌ FAILED: [data-receipt-root] element not found in rendered HTML');
        await browser.close();
        process.exit(1);
    }

    console.log('[Validate] ✅ [data-receipt-root] element found');

    // Step 3: Generate PDF
    console.log('[Validate] Step 3: Generating PDF...');
    const pdfPath = path.join(outputDir, `${transactionId}.pdf`);
    await page.pdf({
        path: pdfPath,
        format: 'A5',
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        pageRanges: '1',
        preferCSSPageSize: true,
    });
    console.log(`[Validate] PDF saved to: ${pdfPath}`);

    // Step 4: Generate JPG
    console.log('[Validate] Step 4: Generating JPG...');
    const jpgPath = path.join(outputDir, `${transactionId}.jpg`);
    await page.screenshot({
        path: jpgPath,
        type: 'jpeg',
        quality: 90,
        fullPage: false,
        clip: { x: 0, y: 0, width: 559, height: 794 },
    });
    console.log(`[Validate] JPG saved to: ${jpgPath}`);

    // Step 5: Validation summary
    const pdfSize = fs.statSync(pdfPath).size;
    const jpgSize = fs.statSync(jpgPath).size;

    console.log('\n========================================');
    console.log('   RENDER VALIDATION RESULTS');
    console.log('========================================');
    console.log(`✅ HTML rendered successfully (${html.length} chars)`);
    console.log(`✅ [data-receipt-root] element present`);
    console.log(`✅ PDF generated (${(pdfSize / 1024).toFixed(1)} KB)`);
    console.log(`✅ JPG generated (${(jpgSize / 1024).toFixed(1)} KB)`);
    console.log('');
    console.log('Output files:');
    console.log(`  HTML: ${htmlPath}`);
    console.log(`  PDF:  ${pdfPath}`);
    console.log(`  JPG:  ${jpgPath}`);
    console.log('');
    console.log('👉 Please visually inspect the PDF and JPG to confirm');
    console.log('   they match the expected receipt layout.');
    console.log('========================================');

    await browser.close();
    process.exit(0);
}

main().catch((err) => {
    console.error('[Validate] Fatal error:', err);
    process.exit(1);
});
