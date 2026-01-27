import { NextRequest, NextResponse } from 'next/server';
import { generateExcelTemplate } from '@/lib/excel-parser';

export async function GET(_request: NextRequest) {
    try {
        _request.headers.get('accept');
        const buffer = await generateExcelTemplate();
        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type':
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition':
                    'attachment; filename="transactions-template.xlsx"',
            },
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to generate template' },
            { status: 500 }
        );
    }
}
