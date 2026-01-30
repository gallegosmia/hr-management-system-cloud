import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { validateBranchRequest } from '@/lib/middleware/branch-auth';
import { isSuperAdmin, normalizeBranchName } from '@/lib/branch-access';
import { getEmployeeById } from '@/lib/data';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'profile_photos');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
    try {
        // Validate session
        const validation = await validateBranchRequest(request);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: validation.errorCode || 403 });
        }
        const { user } = validation;

        const { employee_id, photo } = await request.json();

        if (!employee_id || !photo) {
            return NextResponse.json({ error: 'Employee ID and photo are required' }, { status: 400 });
        }

        // Get employee to check branch
        const employee = await getEmployeeById(parseInt(employee_id));
        if (!employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        // Branch Access Control
        if (!isSuperAdmin(user!.role)) {
            if (employee.branch && user!.assigned_branch) {
                if (normalizeBranchName(employee.branch) !== normalizeBranchName(user!.assigned_branch)) {
                    return NextResponse.json(
                        { error: 'Access denied: You cannot modify employees from other branches' },
                        { status: 403 }
                    );
                }
            }
        }

        let photoPath = photo;

        // If it's a base64 string, save it to file
        if (photo.startsWith('data:image/')) {
            try {
                const matches = photo.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const extension = matches[1];
                    const base64Data = matches[2];
                    const buffer = Buffer.from(base64Data, 'base64');

                    const filename = `profile_${employee_id}_${Date.now()}.${extension}`;
                    const filePath = path.join(UPLOAD_DIR, filename);

                    fs.writeFileSync(filePath, buffer);

                    photoPath = `/uploads/profile_photos/${filename}`;
                }
            } catch (err) {
                console.error('Failed to save photo to disk:', err);
                return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
            }
        }

        // Update employee profile picture
        await query(
            'UPDATE employees SET profile_picture = $1 WHERE id = $2',
            [photoPath, employee_id]
        );

        // Audit log
        try {
            await query(
                'INSERT INTO audit_logs (user_id, action, details, created_at) VALUES ($1, $2, $3, $4)',
                [user!.id, 'PROFILE_PHOTO_UPDATE', JSON.stringify({ employee_id, photo_url: photoPath }), new Date().toISOString()]
            );
        } catch (auditErr) {
            console.error('Failed to log audit:', auditErr);
        }

        return NextResponse.json({ success: true, message: 'Photo uploaded successfully', path: photoPath });
    } catch (error: any) {
        console.error('Photo upload error:', error);
        return NextResponse.json({ error: 'Failed to upload photo: ' + error.message }, { status: 500 });
    }
}
