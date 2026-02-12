
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
    try {
        const data = await request.formData();
        const file: File | null = data.get('file') as unknown as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const finalFilename = `${uniqueSuffix}-${filename}`;

        // Save to public/uploads
        const path = join(process.cwd(), 'public/uploads', finalFilename);
        await writeFile(path, buffer);

        // Return URL
        return NextResponse.json({
            success: true,
            url: `/uploads/${finalFilename}`,
            filename: file.name,
            size: file.size,
            type: file.type
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
