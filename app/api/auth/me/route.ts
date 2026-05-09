
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const sessionId = request.headers.get('x-session-id') || request.cookies.get('sessionId')?.value;

        if (!sessionId) {
            return NextResponse.json({ error: 'No session provided' }, { status: 401 });
        }

        const session = await getSession(sessionId);

        if (!session) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        return NextResponse.json({
            user: session.user,
            selectedBranch: session.selectedBranch
        });
    } catch (error) {
        console.error('Session validation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
