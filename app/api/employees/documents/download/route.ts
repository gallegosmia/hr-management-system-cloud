import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');
        const filename = searchParams.get('filename');

        if (!employeeId || !filename) {
            return new NextResponse('Missing required parameters', { status: 400 });
        }

        // Get Internal ID
        const empRes = await query('SELECT id FROM employees WHERE employee_id = $1', [employeeId]);
        if (empRes.rows.length === 0) {
            return new NextResponse('Employee not found', { status: 404 });
        }
        const internalId = empRes.rows[0].id;

        const res = await query(
            'SELECT file_data, document_name FROM documents WHERE employee_id = $1 AND document_name = $2',
            [internalId, filename]
        );

        if (res.rows.length === 0) {
            return new NextResponse('File not found', { status: 404 });
        }

        const fileData = res.rows[0].file_data; // This comes as a Buffer from pg

        // Determine content type (simple fallback)
        let contentType = 'application/octet-stream';
        if (filename.endsWith('.pdf')) contentType = 'application/pdf';
        if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';
        if (filename.endsWith('.png')) contentType = 'image/png';

        return new NextResponse(fileData, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        });

    } catch (error) {
        console.error('Download error:', error);
        return new NextResponse('Download failed', { status: 500 });
    }
}
