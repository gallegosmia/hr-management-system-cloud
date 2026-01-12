import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');
        const filename = searchParams.get('filename');

        if (!employeeId || !filename) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const filePath = path.join(UPLOAD_DIR, employeeId, filename);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const fileBuffer = fs.readFileSync(filePath);

        // Determine content type
        const ext = path.extname(filename).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.pdf') contentType = 'application/pdf';
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.doc' || ext === '.docx') contentType = 'application/msword';

        const isView = searchParams.get('view') === 'true';
        const displayFilename = filename.split('_').slice(2).join('_');

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': isView
                    ? `inline; filename="${displayFilename}"`
                    : `attachment; filename="${displayFilename}"`
            }
        });
    } catch (error) {
        console.error('Download error:', error);
        return NextResponse.json({ error: 'Download failed' }, { status: 500 });
    }
}
