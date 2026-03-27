/**
 * Schema Inspector — shows actual DB table columns
 * GET /api/admin/schema-check
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getRequestSession } from '@/lib/middleware/branch-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getRequestSession(request);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tables = [
            'payroll_runs', 'payslips', 'payroll_audit_log',
            'user_notifications', 'employees', 'users'
        ];

        const schema: Record<string, any[]> = {};

        for (const table of tables) {
            try {
                const res = await query(`
                    SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = $1
                    ORDER BY ordinal_position
                `, [table]);
                schema[table] = res.rows;
            } catch (e: any) {
                schema[table] = [{ error: e.message }];
            }
        }

        // Also list all tables
        const tablesRes = await query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' ORDER BY table_name
        `);

        return NextResponse.json({
            all_tables: tablesRes.rows.map((r: any) => r.table_name),
            columns: schema
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
