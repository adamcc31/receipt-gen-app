import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const batch = await prisma.batchUpload.findUnique({
            where: { id },
            include: {
                transactions: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!batch) {
            return NextResponse.json(
                { error: 'Batch not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(batch);
    } catch (error) {
        console.error('Failed to fetch batch:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        await prisma.batchUpload.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete batch:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
