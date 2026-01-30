import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define path specifically for the local JSON DB environment
const DB_FILE = path.join(process.cwd(), 'data', 'database.json');
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'profile_photos');

export async function POST(request: NextRequest) {
    try {
        if (!fs.existsSync(DB_FILE)) {
            return NextResponse.json({ error: 'Database not found' }, { status: 404 });
        }

        if (!fs.existsSync(UPLOAD_DIR)) {
            fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        }

        const dbRaw = fs.readFileSync(DB_FILE, 'utf-8');
        const db = JSON.parse(dbRaw);

        if (!db.employees) {
            return NextResponse.json({ message: 'No employees found' });
        }

        let updatedCount = 0;
        let savedBytes = 0;

        db.employees = db.employees.map((emp: any) => {
            if (emp.profile_picture && emp.profile_picture.startsWith('data:image/')) {
                try {
                    // Extract base64 data
                    const matches = emp.profile_picture.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);

                    if (matches && matches.length === 3) {
                        const extension = matches[1]; // e.g., 'png', 'jpeg'
                        const base64Data = matches[2];
                        const buffer = Buffer.from(base64Data, 'base64');

                        const filename = `profile_${emp.id}_${Date.now()}.${extension}`;
                        const filePath = path.join(UPLOAD_DIR, filename);

                        fs.writeFileSync(filePath, buffer);

                        // Calculate saved size (rough estimate)
                        savedBytes += emp.profile_picture.length;

                        // Update record with URL
                        emp.profile_picture = `/uploads/profile_photos/${filename}`;
                        updatedCount++;
                    }
                } catch (err) {
                    console.error(`Failed to optimize image for employee ${emp.id}`, err);
                }
            }
            return emp;
        });

        if (updatedCount > 0) {
            fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        }

        return NextResponse.json({
            success: true,
            message: `Optimized ${updatedCount} images.`,
            savedBytes: savedBytes
        });

    } catch (error: any) {
        console.error('Optimization error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
