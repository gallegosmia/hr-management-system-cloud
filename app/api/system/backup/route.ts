import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

// GET: Download the backup file
export async function GET() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            return NextResponse.json({ error: 'Database file not found.' }, { status: 404 });
        }

        const fileBuffer = fs.readFileSync(DB_FILE);
        const date = new Date().toISOString().split('T')[0];

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="hrms_backup_${date}.json"`
            }
        });
    } catch (error: any) {
        console.error('Backup error:', error);
        return NextResponse.json({ error: 'Failed to generate backup.' }, { status: 500 });
    }
}

// POST: Restore the database from a file
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Validate JSON
        try {
            JSON.parse(buffer.toString('utf-8'));
        } catch (e) {
            return NextResponse.json({ error: 'Invalid JSON file.' }, { status: 400 });
        }

        // Create a backup of the current DB just in case, before overwriting
        if (fs.existsSync(DB_FILE)) {
            const backupPath = path.join(process.cwd(), 'data', `database.backup.${Date.now()}.json`);
            fs.copyFileSync(DB_FILE, backupPath);
        }

        // Overwrite standard DB file
        fs.writeFileSync(DB_FILE, buffer);

        return NextResponse.json({ success: true, message: 'Database restored successfully.' });

    } catch (error: any) {
        console.error('Restore error:', error);
        return NextResponse.json({ error: error.message || 'Failed to restore database.' }, { status: 500 });
    }
}
