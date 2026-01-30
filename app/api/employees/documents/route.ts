import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'documents');

// Ensure directory exists
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

        const buffer = Buffer.from(await file.arrayBuffer());

        const empRes = await query('SELECT id FROM employees WHERE employee_id = $1', [employeeId]);
        if (empRes.rows.length === 0) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }
        const internalId = empRes.rows[0].id;

        const filename = `${documentType}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = path.join(UPLOAD_DIR, filename);

        // Save to disk
        fs.writeFileSync(filePath, buffer);

        // Insert into DB - Store relative path in file_path, and NULL for file_data
        // Note: Assuming schema allows file_path. If using PostgreSQL, schema migration is needed. 
        // For Local JSON, it's fine.
        await query(
            'INSERT INTO documents (employee_id, category, document_name, file_size, uploaded_by, file_data, file_path) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [internalId, documentType, filename, file.size, 1, null, `/uploads/documents/${filename}`]
        );

        return NextResponse.json({
            success: true,
            filename,
            path: `/api/employees/documents/download?employeeId=${employeeId}&filename=${filename}`
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({
            error: `Upload failed: ${error.message || String(error)}`
        }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');

        if (!employeeId) {
            return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
        }

        // Get Internal ID
        const empRes = await query('SELECT id FROM employees WHERE employee_id = $1', [employeeId]);
        if (empRes.rows.length === 0) {
            return NextResponse.json([]);
        }
        const internalId = empRes.rows[0].id;

        const result = await query(
            'SELECT document_name, category, file_size, uploaded_at FROM documents WHERE employee_id = $1 ORDER BY uploaded_at DESC',
            [internalId]
        );

        const files = result.rows.map(row => ({
            filename: row.document_name,
            size: row.file_size,
            uploadedAt: row.uploaded_at,
            type: row.category,
            url: `/api/employees/documents/download?employeeId=${employeeId}&filename=${row.document_name}`
        }));

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

        const empRes = await query('SELECT id FROM employees WHERE employee_id = $1', [employeeId]);
        if (empRes.rows.length === 0) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }
        const internalId = empRes.rows[0].id;

        // Optional: Delete physical file if needed
        // For now, just remove DB record. 
        // We could look up the file_path and unlink it.
        const fileRes = await query('SELECT file_path FROM documents WHERE employee_id = $1 AND document_name = $2', [internalId, filename]);
        if (fileRes.rows.length > 0 && fileRes.rows[0].file_path) {
            const absolutePath = path.join(process.cwd(), 'public', fileRes.rows[0].file_path);
            if (fs.existsSync(absolutePath)) {
                try { fs.unlinkSync(absolutePath); } catch (e) { }
            }
        }

        await query(
            'DELETE FROM documents WHERE employee_id = $1 AND document_name = $2',
            [internalId, filename]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete file error:', error);
        return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }
}
