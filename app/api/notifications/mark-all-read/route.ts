
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getRequestSession } from '@/lib/middleware/branch-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const session = await getRequestSession(request);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Mark all notifications as read
        await query(
            `UPDATE user_notifications 
             SET is_read = TRUE, read_at = CURRENT_TIMESTAMP 
             WHERE user_id = $1 AND is_read = FALSE`,
            [session.user.id]
        );

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Failed to mark all as read:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
