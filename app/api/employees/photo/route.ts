import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
    try {
        const { employee_id, photo } = await request.json();

        if (!employee_id || !photo) {
            return NextResponse.json({ error: 'Employee ID and photo are required' }, { status: 400 });
        }

        // Validate base64 image
        if (!photo.startsWith('data:image/')) {
            return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
        }

        // Update employee profile picture
        await query(
            'UPDATE employees SET profile_picture = $1 WHERE id = $2',
            [photo, employee_id]
        );

        // Audit log
        try {
            await query(
                'INSERT INTO audit_logs (user_id, action, details, created_at) VALUES ($1, $2, $3, $4)',
                [employee_id, 'PROFILE_PHOTO_UPDATE', JSON.stringify({ employee_id }), new Date().toISOString()]
            );
        } catch (auditErr) {
            console.error('Failed to log audit:', auditErr);
        }

        return NextResponse.json({ success: true, message: 'Photo uploaded successfully' });
    } catch (error: any) {
        console.error('Photo upload error:', error);
        return NextResponse.json({ error: 'Failed to upload photo: ' + error.message }, { status: 500 });
    }
}
