
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getRequestSession } from '@/lib/middleware/branch-auth';

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
                reference_id INTEGER,
                reference_type VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch (e) {
        // Table may already exist — ignore
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await getRequestSession(request);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await ensureNotificationsTable();

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const unreadOnly = searchParams.get('unread') === 'true';

        let sql = `SELECT * FROM user_notifications WHERE user_id = $1`;
        const params: any[] = [session.user.id];

        if (unreadOnly) {
            sql += ` AND is_read = FALSE`;
        }

        sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await query(sql, params);
        const countResult = await query(
            `SELECT COUNT(*) as count FROM user_notifications WHERE user_id = $1 AND is_read = FALSE`,
            [session.user.id]
        );

        return NextResponse.json({
            notifications: result.rows,
            unreadCount: parseInt(countResult.rows[0]?.count || '0')
        });

    } catch (error: any) {
        console.error('Failed to fetch notifications:', error);
        // Return empty rather than 500 — prevents breaking the whole page
        return NextResponse.json({ notifications: [], unreadCount: 0 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getRequestSession(request);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await ensureNotificationsTable();

        const body = await request.json();
        const { title, message, type, severity, link, reference_id } = body;

        const result = await query(
            `INSERT INTO user_notifications (user_id, title, message, type, severity, link, reference_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [
                session.user.id,
                title,
                message,
                type || 'system',
                severity || 'medium',
                link || '#',
                reference_id
            ]
        );

        return NextResponse.json(result.rows[0]);

    } catch (error) {
        console.error('Failed to create notification:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
