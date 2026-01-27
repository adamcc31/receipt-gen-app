import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const batches = await prisma.batchUpload.findMany({
            orderBy: { uploadDate: 'desc' },
            select: {
                id: true,
                filename: true,
                uploadDate: true,
                status: true,
                totalRecords: true,
            },
        });

        return NextResponse.json(batches);
    } catch (error) {
        console.error('Failed to fetch batches:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
