import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const employeeId = formData.get('employeeId') as string;
        const documentType = formData.get('documentType') as string;

        if (!file || !employeeId || !documentType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const employeeDir = path.join(UPLOAD_DIR, employeeId);
        if (!fs.existsSync(employeeDir)) {
            fs.mkdirSync(employeeDir, { recursive: true });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${documentType}_${Date.now()}_${file.name}`;
        const filePath = path.join(employeeDir, filename);

        fs.writeFileSync(filePath, buffer);

        // In a real app, we would save this to the 'documents' table in database.json
        // For now, we'll just return success as the user wants the "folder" structure

        return NextResponse.json({
            success: true,
            filename,
            path: `/api/employees/documents/download?employeeId=${employeeId}&filename=${filename}`
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');

        if (!employeeId) {
            return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
        }

        const employeeDir = path.join(UPLOAD_DIR, employeeId);
        if (!fs.existsSync(employeeDir)) {
            return NextResponse.json([]);
        }

        const files = fs.readdirSync(employeeDir).map(filename => {
            const stats = fs.statSync(path.join(employeeDir, filename));
            return {
                filename,
                size: stats.size,
                uploadedAt: stats.mtime,
                type: filename.split('_')[0], // Extract document type from prefix
                url: `/api/employees/documents/download?employeeId=${employeeId}&filename=${filename}`
            };
        });

        return NextResponse.json(files);
    } catch (error) {
        console.error('List files error:', error);
        return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');
        const filename = searchParams.get('filename');

        if (!employeeId || !filename) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const filePath = path.join(UPLOAD_DIR, employeeId, filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }
    } catch (error) {
        console.error('Delete file error:', error);
        return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }
}
