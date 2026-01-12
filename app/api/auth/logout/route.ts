import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const { sessionId } = await request.json();

        if (sessionId) {
            await deleteSession(sessionId);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: 'Logout failed' },
            { status: 500 }
        );
    }
}
