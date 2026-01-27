import { NextRequest, NextResponse } from 'next/server';
import { insert } from '@/lib/database';

export async function POST(request: NextRequest) {
    try {
        const { user_id, action, details } = await request.json();

        if (!user_id || !action) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

        await insert('audit_logs', {
            user_id,
            action,
            details: JSON.stringify(details || {}),
            ip_address: ip,
            created_at: new Date().toISOString()
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Create audit log error:', error);
        return NextResponse.json(
            { error: 'Failed to create audit log' },
            { status: 500 }
        );
    }
}
