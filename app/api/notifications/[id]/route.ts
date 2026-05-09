
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getRequestSession } from '@/lib/middleware/branch-auth';
import { ensureUserNotificationsTable } from '@/lib/notification-schema';

export const dynamic = 'force-dynamic';

// Auto-create user_notifications table if it doesn't exist
async function ensureNotificationsTable() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS user_notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(50) NOT NULL DEFAULT 'system',
                title VARCHAR(255) NOT NULL,
                message TEXT,
                severity VARCHAR(20) DEFAULT 'medium',
                link VARCHAR(500) DEFAULT '#',
                is_read BOOLEAN DEFAULT FALSE,
                reference_id VARCHAR(255),
                reference_type VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch (e) {
        // Table may already exist — ignore
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getRequestSession(request);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await ensureUserNotificationsTable();

        const notificationId = params.id;
        const body = await request.json();
        const { is_read, title, message, type, severity, link, reference_id, timestamp } = body;

        // Check if the notificationId exists strictly as a DB primary key (numeric)
        // AND check if the request explicitly flagged this as a DB ID vs Reference ID.
        // Actually, safer approach:
        // 1. Try to find the exact ID in `user_notifications.id`.
        // 2. If not found, fall back to checking `reference_id`.
        // BUT `id` is integer. If notificationId is a non-numeric string, parseInt fails and throws.

        let dbId = Number(notificationId);

        let existingRecord = null;
        let isDbId = false;

        if (!isNaN(dbId)) {
            // It's strictly numeric. Try to find it as a Primary Key first.
            const pkCheck = await query(
                `SELECT * FROM user_notifications WHERE id = $1 AND user_id = $2`,
                [dbId, session.user.id]
            );
            if (pkCheck.rows.length > 0) {
                existingRecord = pkCheck.rows[0];
                isDbId = true;
            }
        }

        // If not found by primary key, or if it's a non-numeric string (like "loan-review-1")
        if (!existingRecord) {
            const refCheck = await query(
                `SELECT * FROM user_notifications WHERE reference_id = $1 AND user_id = $2`,
                [notificationId, session.user.id]
            );
            if (refCheck.rows.length > 0) {
                existingRecord = refCheck.rows[0];
            }
        }

        if (existingRecord) {
            // Update existing record (read/unread toggling)
            await query(
                `UPDATE user_notifications 
                 SET is_read = $1 
                 WHERE id = $2 AND user_id = $3`,
                [is_read, existingRecord.id, session.user.id]
            );
            return NextResponse.json({ success: true, id: existingRecord.id });
        } else {
            // Record does not exist in DB yet.
            // This happens when front-end passes a dynamic notification (Leaves, Loans) that hasn't been saved yet.
            // We must insert it into the DB marked as read.
            await query(
                `INSERT INTO user_notifications 
                 (user_id, title, message, type, severity, link, reference_id, is_read, created_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    session.user.id,
                    title || 'Notification',
                    message || '',
                    type || 'system',
                    severity || 'low',
                    link || '#',
                    reference_id || notificationId,
                    is_read, // true or false
                    timestamp || new Date().toISOString()
                ]
            );
            return NextResponse.json({ success: true, created: true });
        }

    } catch (error) {
        console.error('Failed to update notification:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
