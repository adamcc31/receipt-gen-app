import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import ReceiptGensen from '@/components/templates/ReceiptGensen';
import { calculateTransaction } from '@/lib/calculations';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function RenderGensenPage({ params }: Props) {
    const { id } = await params;

    const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: { batch: true },
    });

    if (!transaction || transaction.type !== 'GENSEN') {
        notFound();
    }

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

    const rawName = transaction.batch?.filename || 'MANUAL_UPLOAD';
    const cleanName = rawName
        .replace(/\.[^/.]+$/, '')
        .replace(/\s+/g, '_')
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, '')
        .replace(/_{2,}/g, '_')
        .trim();
    const rowNum = String(transaction.rowIndex ?? 1).padStart(2, '0');

    const receiptData = {
        receiptNumber: `${cleanName}-${rowNum}`,
        date: new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }),
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

    return (
        <ReceiptGensen data={receiptData} density="compact" />
    );
}
