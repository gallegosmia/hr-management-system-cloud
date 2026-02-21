
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getRequestSession } from '@/lib/middleware/branch-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getRequestSession(request);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const unreadOnly = searchParams.get('unread') === 'true';

        let sql = `
            SELECT * FROM user_notifications 
            WHERE user_id = $1
        `;
        const params: any[] = [session.user.id];

        if (unreadOnly) {
            sql += ` AND is_read = FALSE`;
        }

        sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await query(sql, params);

        // Count unread
        const countResult = await query(
            `SELECT COUNT(*) as count FROM user_notifications WHERE user_id = $1 AND is_read = FALSE`,
            [session.user.id]
        );

        return NextResponse.json({
            notifications: result.rows,
            unreadCount: parseInt(countResult.rows[0]?.count || '0')
        });

    } catch (error) {
        console.error('Failed to fetch notifications:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getRequestSession(request);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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
