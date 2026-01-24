import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type MonthlyDataPoint = {
    month: string;      // YYYY-MM format
    label: string;      // Display label (e.g., "Jan 2026")
    receiptCount: number;
    totalAmount: number;
    avgAmount: number;
};

type AnalyticsResponse = {
    monthlyData: MonthlyDataPoint[];
    summary: {
        totalReceipts: number;
        totalAmount: number;
        avgPerReceipt: number;
        avgPerMonth: number;
        growthPercent: number | null;
    };
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonthLabel(dateStr: string): string {
    const [year, month] = dateStr.split('-');
    const monthIndex = parseInt(month, 10) - 1;
    return `${MONTH_NAMES[monthIndex]} ${year}`;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const monthsParam = searchParams.get('months');
        const monthsToFetch = monthsParam === '6' ? 6 : 12;

        // Calculate date range
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth() - monthsToFetch + 1, 1);

        // Fetch all generated transactions within the date range
        const transactions = await prisma.transaction.findMany({
            where: {
                status: 'GENERATED',
                generatedAt: {
                    gte: startDate,
                },
            },
            select: {
                generatedAt: true,
                finalNominalIdr: true,
            },
            orderBy: {
                generatedAt: 'asc',
            },
        });

        // Aggregate by month
        const monthlyMap = new Map<string, { count: number; total: number }>();

        // Initialize all months in range
        for (let i = 0; i < monthsToFetch; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - monthsToFetch + 1 + i, 1);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyMap.set(key, { count: 0, total: 0 });
        }

        // Populate with actual data
        for (const tx of transactions) {
            if (!tx.generatedAt) continue;
            const date = new Date(tx.generatedAt);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            const existing = monthlyMap.get(key);
            if (existing) {
                existing.count += 1;
                existing.total += Number(tx.finalNominalIdr);
            }
        }

        // Convert to array
        const monthlyData: MonthlyDataPoint[] = [];
        const sortedKeys = Array.from(monthlyMap.keys()).sort();

        for (const key of sortedKeys) {
            const data = monthlyMap.get(key)!;
            monthlyData.push({
                month: key,
                label: formatMonthLabel(key),
                receiptCount: data.count,
                totalAmount: Math.round(data.total),
                avgAmount: data.count > 0 ? Math.round(data.total / data.count) : 0,
            });
        }

        // Calculate summary
        const totalReceipts = monthlyData.reduce((sum, d) => sum + d.receiptCount, 0);
        const totalAmount = monthlyData.reduce((sum, d) => sum + d.totalAmount, 0);
        const monthsWithData = monthlyData.filter(d => d.receiptCount > 0).length;

        // Calculate growth (current vs previous month)
        let growthPercent: number | null = null;
        if (monthlyData.length >= 2) {
            const currentMonth = monthlyData[monthlyData.length - 1];
            const previousMonth = monthlyData[monthlyData.length - 2];
            if (previousMonth.receiptCount > 0) {
                growthPercent = Math.round(
                    ((currentMonth.receiptCount - previousMonth.receiptCount) / previousMonth.receiptCount) * 100
                );
            }
        }

        const response: AnalyticsResponse = {
            monthlyData,
            summary: {
                totalReceipts,
                totalAmount,
                avgPerReceipt: totalReceipts > 0 ? Math.round(totalAmount / totalReceipts) : 0,
                avgPerMonth: monthsWithData > 0 ? Math.round(totalReceipts / monthsWithData) : 0,
                growthPercent,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Failed to fetch analytics data:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
