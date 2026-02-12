import { NextRequest, NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/data';
import { requireBranchAuth } from '@/lib/middleware/branch-auth';

export async function GET(request: NextRequest) {
    try {
        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;
        const [user, selectedBranch] = auth;

        const stats = await getDashboardStats(selectedBranch);
        return NextResponse.json(stats);
    } catch (error) {
        console.error('Dashboard stats error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard statistics' },
            { status: 500 }
        );
    }
}
