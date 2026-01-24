import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import ReceiptNenkin from '@/components/templates/ReceiptNenkin';
import { calculateTransaction } from '@/lib/calculations';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function RenderNenkinPage({ params }: Props) {
    const { id } = await params;

    const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: { batch: true },
    });

    if (
        !transaction ||
        (transaction.type !== 'NENKIN_NORMAL' && transaction.type !== 'NENKIN_SPEED')
    ) {
        notFound();
    }

    const result = calculateTransaction(
        transaction.type,
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

    return (
        <ReceiptNenkin data={receiptData} density="compact" />
    );
}
