/**
 * Payslip View API Route
 * GET /api/payroll/payslips/[id] - Get single payslip with employee details
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireBranchAuth } from '@/lib/middleware/branch-auth';
import { canViewPayslip } from '@/lib/payroll-access';

// GET /api/payroll/payslips/[id] - Get payslip details
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;
        const [user, selectedBranch] = auth;

        const payslipId = params.id;

        // Multi-step fetch for better JSON database support (joins are limited)

        // 1. Get Payslip
        const payslipResult = await query(`SELECT * FROM payslips WHERE id = $1`, [payslipId]);
        if (payslipResult.rows.length === 0) {
            return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });
        }
        const rawPayslip = payslipResult.rows[0];

        // 2. Get Employee
        const empResult = await query(`SELECT * FROM employees WHERE id = $1`, [rawPayslip.employee_id]);
        const employee = empResult.rows[0] || {};

        // 3. Get Payroll Run
        const runResult = await query(`SELECT * FROM payroll_runs WHERE id = $1`, [rawPayslip.payroll_run_id]);
        const payrollRun = runResult.rows[0] || {};

        // Combine data
        const payslip = {
            ...rawPayslip,
            employee_number: employee.employee_id, // Preserve string ID
            first_name: employee.first_name,
            last_name: employee.last_name,
            department: employee.department,
            position: employee.position,
            branch: employee.branch,
            run_number: payrollRun.run_number,
            payroll_period_start: payrollRun.payroll_period_start,
            payroll_period_end: payrollRun.payroll_period_end,
            cutoff_day: payrollRun.cutoff_day,
            payroll_status: payrollRun.status
        };

        // Check if user can view this payslip
        if (!canViewPayslip(user, payslip.employee_id)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        return NextResponse.json({ payslip });

    } catch (error: any) {
        console.error('Error fetching payslip:', error);
        return NextResponse.json(
            { error: 'Failed to fetch payslip', details: error.message },
            { status: 500 }
        );
    }
}
