import { NextResponse } from 'next/server';
import { getDepartments } from '@/lib/data';

export async function GET() {
    try {
        const departments = await getDepartments();
        return NextResponse.json(departments);
    } catch (error) {
        console.error('Get departments error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch departments' },
            { status: 500 }
        );
    }
}
