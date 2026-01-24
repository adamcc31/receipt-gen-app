import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const settings = await prisma.globalSetting.findMany({
            orderBy: { key: 'asc' },
        });

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Failed to fetch settings:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const setting = await prisma.globalSetting.create({
            data: {
                key: body.key,
                value: body.value,
                description: body.description || null,
            },
        });

        return NextResponse.json(setting);
    } catch (error) {
        console.error('Failed to create setting:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
