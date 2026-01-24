import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateTransaction } from '@/lib/calculations';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const body = await request.json();

        // Get the current transaction
        const transaction = await prisma.transaction.findUnique({
            where: { id },
        });

        if (!transaction) {
            return NextResponse.json(
                { error: 'Transaction not found' },
                { status: 404 }
            );
        }

        // Merge updates
        const updates: Record<string, unknown> = {};

        if (body.clientName !== undefined) {
            updates.clientName = body.clientName;
        }

        if (body.rawNominalYen !== undefined) {
            updates.rawNominalYen = body.rawNominalYen;
        }

        if (body.exchangeRate !== undefined) {
            updates.exchangeRate = body.exchangeRate;
        }

        if (body.additionalCostLabel !== undefined) {
            updates.additionalCostLabel = body.additionalCostLabel;
        }

        if (body.additionalCostAmount !== undefined) {
            updates.additionalCostAmount = body.additionalCostAmount;
        }

        if (body.regionalTaxYen !== undefined) {
            updates.regionalTaxYen = body.regionalTaxYen;
        }

        if (body.shippingFeeIdr !== undefined) {
            updates.shippingFeeIdr = body.shippingFeeIdr;
        }

        if (body.taxRepresentativeFeeYen !== undefined) {
            updates.taxRepresentativeFeeYen = body.taxRepresentativeFeeYen;
        }

        if (body.gensenYear !== undefined) {
            updates.gensenYear = body.gensenYear;
        }

        if (body.note !== undefined) {
            updates.note = body.note;
        }

        // Recalculate if nominal or rate changed
        if (
            body.rawNominalYen !== undefined ||
            body.exchangeRate !== undefined ||
            body.additionalCostAmount !== undefined ||
            body.regionalTaxYen !== undefined ||
            body.shippingFeeIdr !== undefined ||
            body.taxRepresentativeFeeYen !== undefined
        ) {
            const nominal = body.rawNominalYen ?? transaction.rawNominalYen.toString();
            const rate = body.exchangeRate ?? transaction.exchangeRate.toString();
            const additionalCostAmount =
                body.additionalCostAmount ?? transaction.additionalCostAmount?.toString() ?? '0';
            const regionalTaxYen =
                body.regionalTaxYen ?? transaction.regionalTaxYen?.toString?.() ?? '0';
            const shippingFeeIdr =
                body.shippingFeeIdr ?? transaction.shippingFeeIdr?.toString?.() ?? '0';
            const taxRepresentativeFeeYen =
                body.taxRepresentativeFeeYen ??
                transaction.taxRepresentativeFeeYen?.toString?.() ??
                '0';

            const result = calculateTransaction(transaction.type, nominal, rate, {
                regionalTaxYen,
                shippingFeeIdr,
                taxRepresentativeFeeYen,
                additionalCostAmount,
            });
            updates.finalNominalIdr = result.finalNominalIdr.toString();
            updates.adminFeePercentage = result.adminFeePercentage.toString();
        }

        // Update the transaction
        const updated = await prisma.transaction.update({
            where: { id },
            data: updates,
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Failed to update transaction:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
