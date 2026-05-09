import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireBranchAuth } from '@/lib/middleware/branch-auth';
import { getCashAdvanceCutoff } from '@/lib/cash-advance-cutoff';

export const dynamic = 'force-dynamic';

/**
 * Cash Advance Limit API
 * GET ?employee_id=X – Returns the CA limit breakdown for an employee in the current cutoff
 */

export async function GET(request: NextRequest) {
    try {
        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employee_id');
        if (!employeeId) {
            return NextResponse.json({ error: 'employee_id is required' }, { status: 400 });
        }

        // Fetch employee
        const empRes = await query(`SELECT * FROM employees WHERE id = $1`, [parseInt(employeeId)]);
        if (empRes.rows.length === 0) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }
        const employee = empRes.rows[0];

        // Parse daily rate
        let dailyRate = 0;
        try {
            const salaryInfo = typeof employee.salary_info === 'string'
                ? JSON.parse(employee.salary_info)
                : employee.salary_info;
            dailyRate = Number(salaryInfo?.daily_rate || 0);
            if (!dailyRate && salaryInfo?.monthly_salary) {
                dailyRate = Number(salaryInfo.monthly_salary) / 30;
            }
        } catch (_) {}

        const cutoff = getCashAdvanceCutoff();

        // Count working days
        const attRes = await query(
            `SELECT COUNT(*) as cnt FROM attendance
             WHERE employee_id = $1 AND date >= $2 AND date <= $3
             AND LOWER(status) IN ('present', 'half day', 'holiday', 'overtime', 'late')`,
            [parseInt(employeeId), cutoff.startDate, cutoff.endDate]
        );
        const workingDays = Number(attRes.rows[0]?.cnt || 0);
        const allowableCA = Math.round(dailyRate * workingDays * 100) / 100;

        // Already used in this cutoff
        const usedRes = await query(
            `SELECT COALESCE(SUM(
                CASE WHEN status = 'Approved' THEN approved_amount ELSE requested_amount END
            ), 0) as total_used
             FROM cash_advances
             WHERE employee_id = $1 AND cutoff_period = $2
             AND status IN ('Approved', 'For Branch Manager Review', 'For EVP Approval')`,
            [parseInt(employeeId), cutoff.label]
        );
        const alreadyUsed = Number(usedRes.rows[0]?.total_used || 0);
        const remaining = Math.max(0, allowableCA - alreadyUsed);

        return NextResponse.json({
            employee_name: `${employee.first_name} ${employee.last_name}`,
            daily_rate: dailyRate,
            working_days: workingDays,
            allowable_ca: allowableCA,
            already_used: alreadyUsed,
            remaining,
            cutoff: cutoff.label,
            cutoff_display: cutoff.display,
            cutoff_range: `${cutoff.startDate} to ${cutoff.endDate}`,
        });

    } catch (error: any) {
        console.error('[Cash Advance Limit] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch limit', details: error.message }, { status: 500 });
    }
}
