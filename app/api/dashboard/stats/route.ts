import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/data';

export async function GET() {
    try {
        const stats = await getDashboardStats();
        return NextResponse.json(stats);
    } catch (error) {
        console.error('Dashboard stats error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard statistics' },
            { status: 500 }
        );
    }
}
