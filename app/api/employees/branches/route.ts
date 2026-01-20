import { NextResponse } from 'next/server';
import { getBranches } from '@/lib/data';

export async function GET() {
    try {
        const branches = await getBranches();
        return NextResponse.json(branches);
    } catch (error) {
        console.error('Get branches error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch branches' },
            { status: 500 }
        );
    }
}
