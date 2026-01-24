import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseExcelFile } from '@/lib/excel-parser';
import { calculateTransaction } from '@/lib/calculations';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!file.name.endsWith('.xlsx')) {
            return NextResponse.json(
                { error: 'Only .xlsx files are accepted' },
                { status: 400 }
            );
        }

        // Parse the file
        const buffer = Buffer.from(await file.arrayBuffer());
        const parseResult = await parseExcelFile(buffer);

        if (!parseResult.success && parseResult.transactions.length === 0) {
            return NextResponse.json(
                { error: 'Failed to parse file', details: parseResult.errors },
                { status: 400 }
            );
        }

        // Get global settings for calculations
        const settings = await prisma.globalSetting.findMany();
        const settingsMap: Record<string, string> = {};
        settings.forEach((s) => {
            settingsMap[s.key] = s.value;
        });

        // Create batch and transactions
        const batch = await prisma.batchUpload.create({
            data: {
                filename: file.name,
                status: 'COMPLETED',
                totalRecords: parseResult.transactions.length,
                transactions: {
                    create: parseResult.transactions.map((tx, i) => {
                        // Calculate final amount based on type
                        const result = calculateTransaction(tx.type, tx.rawNominalYen, tx.exchangeRate, {
                            nenkinAdminRate: settingsMap['nenkin_admin_rate'],
                            nenkinTaxFixed: settingsMap['nenkin_tax_fixed'],
                            gensenAdminRate: settingsMap['gensen_admin_rate'],
                            regionalTaxYen: tx.regionalTaxYen.toString(),
                            shippingFeeIdr: tx.shippingFeeIdr.toString(),
                            taxRepresentativeFeeYen: tx.taxRepresentativeFeeYen.toString(),
                        });

                        return {
                            clientName: tx.clientName,
                            type: tx.type,
                            rowIndex: i + 1,
                            rawNominalYen: tx.rawNominalYen.toString(),
                            regionalTaxYen: tx.regionalTaxYen.toString(),
                            adminFeePercentage: result.adminFeePercentage.toString(),
                            taxRepresentativeFeeYen:
                                tx.type === 'GENSEN' ? tx.taxRepresentativeFeeYen.toString() : '0',
                            taxFixed:
                                tx.type === 'NENKIN_NORMAL' || tx.type === 'NENKIN_SPEED'
                                    ? result.taxOrAdminFixed.toString()
                                    : '0',
                            speedServiceFee:
                                tx.type === 'NENKIN_SPEED' ? '3000' : null,
                            exchangeRate: tx.exchangeRate.toString(),
                            shippingFeeIdr: tx.shippingFeeIdr.toString(),
                            gensenYear: tx.type === 'GENSEN' ? tx.gensenYear ?? null : null,
                            finalNominalIdr: result.finalNominalIdr.toString(),
                            status: 'DRAFT',
                        };
                    }),
                },
            },
        });

        return NextResponse.json({
            batchId: batch.id,
            totalRecords: parseResult.transactions.length,
            errors: parseResult.errors,
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
