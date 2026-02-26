import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireBranchAuth } from '@/lib/middleware/branch-auth';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;

        const payrollRunId = params.id;

        const result = await query(`
            SELECT pal.*, u.username as username, u.role as user_role
            FROM payroll_audit_log pal
            LEFT JOIN users u ON pal.performed_by = u.id
            WHERE pal.payroll_run_id = $1
            ORDER BY pal.performed_at DESC
        `, [payrollRunId]);

        return NextResponse.json({ logs: result.rows });
    } catch (error: any) {
        console.error('Error fetching payroll audit logs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch audit logs', details: error.message },
            { status: 500 }
        );
    }
}
