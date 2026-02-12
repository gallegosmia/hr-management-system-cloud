import { NextRequest, NextResponse } from 'next/server';
import { updateSessionBranch } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const sessionId = request.headers.get('x-session-id');
        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID required' }, { status: 401 });
        }

        const { branch } = await request.json();
        // 'All' should be stored as null in DB to represent global access, or 'All' if logic expects it
        // and lib/auth/getSession returns it.
        await updateSessionBranch(sessionId, branch);

        return NextResponse.json({ success: true, branch });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update branch' }, { status: 500 });
    }
}
