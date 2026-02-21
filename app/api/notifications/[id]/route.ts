
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getRequestSession } from '@/lib/middleware/branch-auth';

export const dynamic = 'force-dynamic';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getRequestSession(request);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const notificationId = params.id;
        const body = await request.json();
        const { is_read } = body;

        // Check if notification exists
        // If ID is numeric strings, it's likely a DB ID. If it contains dashes generally it's a dynamic ID or generated string

        // Try to update existing
        // We use a flexible query to handle both string and int IDs if DB allows. 
        // But our schema says ID is SERIAL (int). 
        // Dynamic alerts have string IDs (e.g. '201-105').
        // So we need to handle "upsert" logic for dynamic alerts.

        let dbId = parseInt(notificationId);
        if (isNaN(dbId)) {
            // It's a dynamic alert ID (e.g. '201-123')
            // We should check if we already have a record for this "reference_id" for this user
            // Actually, we can just treat the dynamic ID as the 'reference_id'

            const existing = await query(
                `SELECT * FROM user_notifications WHERE user_id = $1 AND reference_id = $2`,
                [session.user.id, notificationId]
            );

            if (existing.rows.length > 0) {
                // Update existing
                await query(
                    `UPDATE user_notifications 
                     SET is_read = $1, read_at = CURRENT_TIMESTAMP 
                     WHERE id = $2`,
                    [is_read, existing.rows[0].id]
                );
                return NextResponse.json({ success: true, id: existing.rows[0].id });
            } else {
                // Insert new "read" record for this dynamic alert
                // We need details from the body to create it properly, or at least a stub
                const { title, message, type, severity, link } = body;

                await query(
                    `INSERT INTO user_notifications 
                     (user_id, title, message, type, severity, link, reference_id, is_read, read_at) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
                    [
                        session.user.id,
                        title || 'Notification',
                        message || '',
                        type || 'system',
                        severity || 'low',
                        link || '#',
                        notificationId, // Use the dynamic ID as reference_id
                        true
                    ]
                );
                return NextResponse.json({ success: true, created: true });
            }
        } else {
            // Normal DB Update
            await query(
                `UPDATE user_notifications 
                 SET is_read = $1, read_at = CURRENT_TIMESTAMP 
                 WHERE id = $2 AND user_id = $3`,
                [is_read, dbId, session.user.id]
            );
            return NextResponse.json({ success: true });
        }

    } catch (error) {
        console.error('Failed to update notification:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
