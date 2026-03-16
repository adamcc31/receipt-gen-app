/**
 * Receipt Renderer Service
 * 
 * Renders receipt React components to full HTML strings using ReactDOMServer.
 * This replaces the self-referential HTTP loopback where Puppeteer navigated
 * back to the same Next.js server to render pages.
 * 
 * IMPORTANT: The data mapping logic is copied exactly from the (renderer) pages:
 *   - (renderer)/render/gensen/[id]/page.tsx
 *   - (renderer)/render/nenkin/[id]/page.tsx
 * Any changes to those pages must be mirrored here.
 */

import React from 'react';
import { calculateTransaction } from '@/lib/calculations';
import { prisma } from '@/lib/prisma';

/**
 * Render a receipt transaction to a complete HTML document string.
 * The HTML includes embedded Google Fonts link and inline styles.
 */
export async function renderReceiptHTML(transactionId: string): Promise<string> {
    // Dynamic imports to bypass Turbopack's restriction on react-dom/server in API route tree
    const { renderToString } = await import('react-dom/server');
    const { default: ReceiptGensen } = await import('@/components/templates/ReceiptGensen');
    const { default: ReceiptNenkin } = await import('@/components/templates/ReceiptNenkin');

    const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { batch: true },
    });

    if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
    }

    // --- Receipt number generation (same logic as render pages) ---
    const rawName = transaction.batch?.filename || 'MANUAL_UPLOAD';
    const cleanName = rawName
        .replace(/\.[^/.]+$/, '')
        .replace(/\s+/g, '_')
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, '')
        .replace(/_{2,}/g, '_')
        .trim();
    const rowNum = String(transaction.rowIndex ?? 1).padStart(2, '0');

    const receiptNumber = `${cleanName}-${rowNum}`;
    const date = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    let component: React.ReactElement;

    if (transaction.type === 'GENSEN') {
        // --- GENSEN: exact same logic as (renderer)/render/gensen/[id]/page.tsx ---
        const result = calculateTransaction(
            transaction.type,
            transaction.rawNominalYen.toString(),
            transaction.exchangeRate.toString(),
            {
                gensenAdminRate: transaction.adminFeePercentage.toString(),
                taxRepresentativeFeeYen: transaction.taxRepresentativeFeeYen.toString(),
                additionalCostAmount:
                    transaction.additionalCostAmount?.toString() ?? '0',
            }
        );

        const receiptData = {
            receiptNumber,
            date,
            clientName: transaction.clientName,
            nominalYen: result.nominalYen.toString(),
            adminFeePercentage: result.adminFeePercentage.toString(),
            adminFeeAmount: result.adminFeeAmount.toString(),
            taxRepresentativeFeeYen: result.taxOrAdminFixed.toString(),
            additionalCostLabel: transaction.additionalCostLabel || undefined,
            additionalCostAmount: result.additionalCostAmount?.toString(),
            netAmountYen: result.netAmountYen.toString(),
            exchangeRate: result.exchangeRate.toString(),
            grossIdr: result.grossIdr.toString(),
            finalNominalIdr: result.finalNominalIdr.toString(),
            gensenYear: transaction.gensenYear || undefined,
            note: transaction.note || undefined,
        };

        component = React.createElement(ReceiptGensen as React.ComponentType<{data: typeof receiptData; density: string}>, { data: receiptData, density: 'compact' });
    } else {
        // --- NENKIN_NORMAL / NENKIN_SPEED: exact same logic as (renderer)/render/nenkin/[id]/page.tsx ---
        const result = calculateTransaction(
            transaction.type as 'NENKIN_NORMAL' | 'NENKIN_SPEED',
            transaction.rawNominalYen.toString(),
            transaction.exchangeRate.toString(),
            {
                nenkinAdminRate: transaction.adminFeePercentage.toString(),
                nenkinTaxFixed: transaction.taxFixed.toString(),
                nenkinSpeedServiceFee:
                    transaction.type === 'NENKIN_SPEED'
                        ? (transaction.speedServiceFee ?? '3000').toString()
                        : undefined,
                regionalTaxYen: transaction.regionalTaxYen.toString(),
                shippingFeeIdr: transaction.shippingFeeIdr.toString(),
                additionalCostAmount:
                    transaction.additionalCostAmount?.toString() ?? '0',
            }
        );

        const receiptData = {
            receiptNumber,
            date,
            clientName: transaction.clientName,
            type: transaction.type,
            nominalYen: result.nominalYen.toString(),
            regionalTaxYen: result.regionalTaxYen?.toString(),
            adminFeePercentage: result.adminFeePercentage.toString(),
            adminFeeAmount: result.adminFeeAmount.toString(),
            taxFixed: result.taxOrAdminFixed.toString(),
            speedServiceFee: result.speedServiceFee?.toString(),
            additionalCostLabel: transaction.additionalCostLabel || undefined,
            additionalCostAmount: result.additionalCostAmount?.toString(),
            netAmountYen: result.netAmountYen.toString(),
            exchangeRate: result.exchangeRate.toString(),
            grossIdr: result.grossIdr.toString(),
            shippingFeeIdr: result.shippingFeeIdr?.toString(),
            finalNominalIdr: result.finalNominalIdr.toString(),
            note: transaction.note || undefined,
        };

        component = React.createElement(ReceiptNenkin as React.ComponentType<{data: typeof receiptData; density: string}>, { data: receiptData, density: 'compact' });
    }

    const bodyHtml = renderToString(component);

    // Build full HTML document with inline font declarations
    // Using direct @font-face with woff2 URLs instead of Google Fonts <link>
    // to avoid the CSS redirect chain that causes networkidle0 timeouts.
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=559" />
    <style>
        @font-face {
            font-family: 'Inter';
            font-style: normal;
            font-weight: 400;
            font-display: swap;
            src: url(https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.woff2) format('woff2');
        }
        @font-face {
            font-family: 'Inter';
            font-style: normal;
            font-weight: 500;
            font-display: swap;
            src: url(https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hjQ.woff2) format('woff2');
        }
        @font-face {
            font-family: 'Inter';
            font-style: normal;
            font-weight: 600;
            font-display: swap;
            src: url(https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjQ.woff2) format('woff2');
        }
        @font-face {
            font-family: 'Inter';
            font-style: normal;
            font-weight: 700;
            font-display: swap;
            src: url(https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjQ.woff2) format('woff2');
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: white;
            font-family: 'Inter', 'Roboto', sans-serif;
        }
    </style>
</head>
<body>${bodyHtml}</body>
</html>`;
}
