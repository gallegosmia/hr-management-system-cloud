import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import fs from 'fs';
import path from 'path';

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
            'SELECT file_data, file_path, document_name FROM documents WHERE employee_id = $1 AND document_name = $2',
            [internalId, filename]
        );

        if (res.rows.length === 0) {
            return new NextResponse('File record not found', { status: 404 });
        }

        const doc = res.rows[0];
        let finalBuffer: Uint8Array | null = null;

        // Strategy: Try file_path first (new way), then file_data (old way)
        if (doc.file_path) {
            const absolutePath = path.join(process.cwd(), 'public', doc.file_path);
            if (fs.existsSync(absolutePath)) {
                const buffer = fs.readFileSync(absolutePath);
                finalBuffer = new Uint8Array(buffer);
            }
        }

        if (!finalBuffer && doc.file_data) {
            let rawData = doc.file_data;
            // Handle JSON-serialized Buffer (from local JSON DB fallback)
            if (rawData && typeof rawData === 'object' && !Buffer.isBuffer(rawData) && (Array.isArray(rawData.data) || rawData.type === 'Buffer')) {
                rawData = Buffer.from(rawData.data || rawData);
            }
            finalBuffer = new Uint8Array(rawData);
        }

        if (!finalBuffer) {
            return new NextResponse('Physical file missing', { status: 404 });
        }

        const isView = searchParams.get('view') === 'true';

        // Determine content type
        let contentType = 'application/octet-stream';
        const lowerFilename = filename.toLowerCase();
        if (lowerFilename.endsWith('.pdf')) contentType = 'application/pdf';
        else if (lowerFilename.endsWith('.jpg') || lowerFilename.endsWith('.jpeg')) contentType = 'image/jpeg';
        else if (lowerFilename.endsWith('.png')) contentType = 'image/png';
        else if (lowerFilename.endsWith('.txt')) contentType = 'text/plain';

        // Determine disposition
        const disposition = isView ? 'inline' : 'attachment';

        // Ensure proper filename encoding for header
        const safeFilename = filename.replace(/"/g, '');

        return new NextResponse(finalBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `${disposition}; filename="${safeFilename}"`,
                'Content-Length': finalBuffer.length.toString(),
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
        });

    } catch (error: any) {
        console.error('Download error:', error);
        return new NextResponse(`Download failed: ${error.message}`, { status: 500 });
    }
}
