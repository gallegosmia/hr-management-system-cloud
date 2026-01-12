import { NextRequest, NextResponse } from 'next/server';
import { getNextEmployeeId } from '@/lib/data';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const year = searchParams.get('year');
        const nextId = await getNextEmployeeId(year || undefined);
        return NextResponse.json({ nextId });
    } catch (error) {
        console.error('Get next employee ID error:', error);
        return NextResponse.json(
            { error: 'Failed to generate next employee ID' },
            { status: 500 }
        );
    }
}
