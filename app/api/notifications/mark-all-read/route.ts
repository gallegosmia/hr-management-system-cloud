
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getRequestSession } from '@/lib/middleware/branch-auth';
import { ensureUserNotificationsTable } from '@/lib/notification-schema';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const session = await getRequestSession(request);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await ensureUserNotificationsTable();

        let dynamicNotifs: any[] = [];
        try {
            const body = await request.json();
            if (body && Array.isArray(body.dynamicNotifs)) {
                dynamicNotifs = body.dynamicNotifs;
            }
        } catch (e) {
            // Ignore if no body
        }

        // Mark all existing notifications as read
        await query(
            `UPDATE user_notifications 
             SET is_read = $1 
             WHERE user_id = $2`,
            [true, session.user.id]
        );

        // Insert dynamically generated frontend notifications as read
        if (dynamicNotifs.length > 0) {
            for (const notif of dynamicNotifs) {
                const referenceId = notif.reference_id || notif.id;
                if (!referenceId) continue;

                // Check if it already exists by reference_id
                const refCheck = await query(
                    `SELECT id FROM user_notifications WHERE reference_id = $1 AND user_id = $2`,
                    [referenceId, session.user.id]
                );

                if (refCheck.rows.length === 0) {
                    await query(
                        `INSERT INTO user_notifications 
                         (user_id, title, message, type, severity, link, reference_id, is_read, created_at) 
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                        [
                            session.user.id,
                            notif.title || 'Notification',
                            notif.message || '',
                            notif.type || 'system',
                            notif.severity || 'low',
                            notif.url || '#',
                            referenceId,
                            true,
                            notif.timestamp || new Date().toISOString()
                        ]
                    );
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Failed to mark all as read:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
