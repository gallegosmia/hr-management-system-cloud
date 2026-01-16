import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

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

        // Check if employee exists first (optional but good practice)
        // const empCheck = await query('SELECT id FROM employees WHERE employee_id = $1', [employeeId]);
        // if (empCheck.rows.length === 0) throw new Error('Employee not found');
        // const internalId = empCheck.rows[0].id; // We might need internal ID if using FK, but schema uses ID.
        // The schema map: employee_id INTEGER. 
        // Wait, schema says employee_id INTEGER REFERENCES employees(id). 
        // But the frontend passes the string ID (e.g. 2024-001). 
        // We need to look up the internal ID.

        const empRes = await query('SELECT id FROM employees WHERE employee_id = $1', [employeeId]);
        if (empRes.rows.length === 0) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }
        const internalId = empRes.rows[0].id;

        const filename = `${documentType}_${Date.now()}_${file.name}`;

        // Insert into DB
        await query(
            'INSERT INTO documents (employee_id, category, document_name, file_size, uploaded_by, file_data) VALUES ($1, $2, $3, $4, $5, $6)',
            [internalId, documentType, filename, file.size, 1, buffer]
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

