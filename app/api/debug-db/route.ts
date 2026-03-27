import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    let url = process.env.DATABASE_URL;
    
    // Cloud Fail-Safe
    if (url && url.includes('supabase.com')) {
        url = 'postgresql://neondb_owner:npg_PslbEZF85iOH@ep-cold-dew-a1pzda3q.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
    }

    if (!url) {
        return NextResponse.json({ error: 'DATABASE_URL is not set in environment' });
    }

    // Mask the password for safety
    const maskedUrl = url.replace(/:([^:@]+)@/, ':****@');
    
    const pool = new Pool({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
    });

    try {
        const client = await pool.connect();
        try {
            const res = await client.query('SELECT NOW() as now, CURRENT_DATABASE() as db, CURRENT_USER as user');
            return NextResponse.json({
                success: true,
                message: 'Connected to PostgreSQL!',
                data: res.rows[0],
                maskedUrl: maskedUrl
            });
        } finally {
            client.release();
        }
    } catch (err: any) {
        return NextResponse.json({
            success: false,
            error: err.message,
            code: err.code,
            detail: err.detail,
            maskedUrl: maskedUrl,
            env: {
                NODE_ENV: process.env.NODE_ENV,
                VERCEL: process.env.VERCEL
            }
        });
    } finally {
        await pool.end();
    }
}
