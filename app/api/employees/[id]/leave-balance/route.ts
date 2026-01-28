import { NextRequest, NextResponse } from 'next/server';
import { getEmployeeLeaveCount } from '@/lib/data';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);
        const { searchParams } = new URL(request.url);
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

        if (isNaN(id)) {
            return NextResponse.json({ error: 'Invalid Employee ID' }, { status: 400 });
        }

        const count = await getEmployeeLeaveCount(id, year);
        const limit = 5;
        const balance = Math.max(0, limit - count);

        return NextResponse.json({ count, limit, balance, year });
    } catch (error) {
        console.error('Fetch leave balance error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
