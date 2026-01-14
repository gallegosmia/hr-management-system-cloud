import { NextRequest, NextResponse } from 'next/server';
import { update } from '@/lib/database';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const employeeId = formData.get('employeeId') as string;

        if (!file || !employeeId) {
            return NextResponse.json({ error: 'File and Employee ID are required' }, { status: 400 });
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
        }

        // Create directory if it doesn't exist
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profile_pictures');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Generate unique filename
        const buffer = Buffer.from(await file.arrayBuffer());
        const timestamp = Date.now();
        const extension = file.name.split('.').pop();
        const filename = `${employeeId}_${timestamp}.${extension}`;
        const filepath = path.join(uploadDir, filename);

        // Write file
        fs.writeFileSync(filepath, buffer);

        // Update database
        const profilePictureUrl = `/uploads/profile_pictures/${filename}`;
        await update('employees', parseInt(employeeId), { profile_picture: profilePictureUrl });

        return NextResponse.json({
            success: true,
            url: profilePictureUrl
        });

    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed: ' + error.message }, { status: 500 });
    }
}
