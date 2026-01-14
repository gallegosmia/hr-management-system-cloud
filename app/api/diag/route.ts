import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profile_pictures');
    const exists = fs.existsSync(uploadDir);
    let files: string[] = [];
    if (exists) {
        files = fs.readdirSync(uploadDir);
    }

    return NextResponse.json({
        cwd: process.cwd(),
        uploadDir,
        exists,
        files,
        env: process.env.NODE_ENV
    });
}
