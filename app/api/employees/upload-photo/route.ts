import { NextRequest, NextResponse } from 'next/server';
import { update } from '@/lib/database';

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

        // Validate file size (e.g., max 1MB for base64 storage)
        // Note: Base64 increases size by ~33%. 1MB limit keeps DB reasonably light.
        if (file.size > 1024 * 1024) {
            return NextResponse.json({ error: 'Image too large. Please resize to under 1MB.' }, { status: 400 });
        }

        // Convert file to buffer then base64
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = `data:${file.type};base64,${buffer.toString('base64')}`;

        // Update database directly with base64 string
        await update('employees', parseInt(employeeId), { profile_picture: base64Image });

        return NextResponse.json({
            success: true,
            url: base64Image
        });

    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed: ' + error.message }, { status: 500 });
    }
}
