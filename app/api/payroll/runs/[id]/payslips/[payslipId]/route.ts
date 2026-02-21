/**
 * Payslip Update API Route
 * PATCH /api/payroll/runs/[id]/payslips/[payslipId] - Update individual payslip
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireBranchAuth } from '@/lib/middleware/branch-auth';
import { canAccessPayroll, canEditPayrollDays } from '@/lib/payroll-access';
import { computePayslip, validatePayrollDays } from '@/lib/payroll-calculations';

// PATCH /api/payroll/runs/[id]/payslips/[payslipId] - Update payslip
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string; payslipId: string } }
) {
    try {
        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;
        const [user, selectedBranch] = auth;

        const payrollRunId = params.id;
        const payslipId = params.payslipId;

        const body = await request.json();
        const { payrollDays, allowances, deductions } = body;

        // Get payroll run and payslip
        const runResult = await query(`SELECT * FROM payroll_runs WHERE id = $1`, [payrollRunId]);
        if (runResult.rows.length === 0) {
            return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
        }

        const payrollRun = runResult.rows[0];

        // Check if locked
        if (payrollRun.status === 'locked') {
            return NextResponse.json({ error: 'Cannot edit locked payroll' }, { status: 400 });
        }

        // Check access
        if (!canAccessPayroll(user, payrollRun.branch)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        if (!canEditPayrollDays(user)) {
            return NextResponse.json({ error: 'No permission to edit payroll' }, { status: 403 });
        }

        // Get current payslip
        const payslipResult = await query(`
            SELECT ps.*, e.salary_info
            FROM payslips ps
            JOIN employees e ON ps.employee_id = e.id
            WHERE ps.id = $1 AND ps.payroll_run_id = $2
        `, [payslipId, payrollRunId]);

        if (payslipResult.rows.length === 0) {
            return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });
        }

        const currentPayslip = payslipResult.rows[0];

        // Build update object
        const updates: any = {};

        // Update payroll days if provided
        if (payrollDays !== undefined) {
            const validation = validatePayrollDays(
                payrollDays,
                new Date(payrollRun.payroll_period_start),
                new Date(payrollRun.payroll_period_end)
            );
            if (!validation.valid) {
                return NextResponse.json({ error: validation.error }, { status: 400 });
            }
            updates.payroll_days = payrollDays;
        }

        // Update allowances if provided
        if (allowances) {
            if (allowances.regular !== undefined) updates.regular_allowance = allowances.regular;
            if (allowances.special !== undefined) updates.special_allowance = allowances.special;
            if (allowances.holiday !== undefined) updates.holiday_pay = allowances.holiday;
        }

        // Update deductions if provided
        if (deductions) {
            if (deductions.phic !== undefined) updates.phic = deductions.phic;
            if (deductions.pagibig !== undefined) updates.pagibig = deductions.pagibig;
            if (deductions.pagibigLoan !== undefined) updates.pagibig_loan = deductions.pagibigLoan;
            if (deductions.companyFunds !== undefined) updates.company_funds = deductions.companyFunds;
            if (deductions.sss !== undefined) updates.sss = deductions.sss;
            if (deductions.sssLoan !== undefined) updates.sssLoan = deductions.sssLoan;
            if (deductions.companyLoan !== undefined) updates.company_loan = deductions.companyLoan;
            if (deductions.cashAdvance !== undefined) updates.cash_advance = deductions.cashAdvance;
            if (deductions.other !== undefined) updates.other_deductions = deductions.other;
        }

        // Recompute payslip
        const updatedPayslip = {
            ...currentPayslip,
            ...updates
        };

        const computed = computePayslip({
            dailyRate: currentPayslip.daily_rate,
            payrollDays: updatedPayslip.payroll_days,
            allowances: {
                regular: updatedPayslip.regular_allowance || 0,
                special: updatedPayslip.special_allowance || 0,
                holiday: updatedPayslip.holiday_pay || 0
            },
            deductions: {
                phic: updatedPayslip.phic || 0,
                pagibig: updatedPayslip.pagibig || 0,
                pagibigLoan: updatedPayslip.pagibig_loan || 0,
                companyFunds: updatedPayslip.company_funds || 0,
                sss: updatedPayslip.sss || 0,
                sssLoan: updatedPayslip.sss_loan || 0,
                companyLoan: updatedPayslip.company_loan || 0,
                cashAdvance: updatedPayslip.cash_advance || 0,
                other: updatedPayslip.other_deductions || 0
            }
        }, payrollRun.cutoff_day);

        // Update payslip in database
        const updateResult = await query(`
            UPDATE payslips
            SET 
                payroll_days = $1,
                basic_pay = $2,
                regular_allowance = $3,
                special_allowance = $4,
                holiday_pay = $5,
                gross_pay = $6,
                phic = $7,
                pagibig = $8,
                pagibig_loan = $9,
                company_funds = $10,
                sss = $11,
                sss_loan = $12,
                company_loan = $13,
                cash_advance = $14,
                other_deductions = $15,
                total_deductions = $16,
                net_pay = $17
            WHERE id = $18
            RETURNING *
        `, [
            updatedPayslip.payroll_days,
            computed.basicPay,
            computed.breakdown.earnings.regularAllowance,
            computed.breakdown.earnings.specialAllowance,
            computed.breakdown.earnings.holidayPay,
            computed.grossPay,
            computed.breakdown.deductions.phic || 0,
            computed.breakdown.deductions.pagibig || 0,
            computed.breakdown.deductions.pagibigLoan || 0,
            computed.breakdown.deductions.companyFunds || 0,
            computed.breakdown.deductions.sss || 0,
            computed.breakdown.deductions.sssLoan || 0,
            computed.breakdown.deductions.companyLoan || 0,
            computed.breakdown.deductions.cashAdvance || 0,
            computed.breakdown.deductions.other || 0,
            computed.totalDeductions,
            computed.netPay,
            payslipId
        ]);

        // Log action
        await query(`
            INSERT INTO payroll_audit_log (payroll_run_id, action, performed_by, details, performed_at)
            VALUES ($1, $2, $3, $4, $5)
        `, [
            payrollRunId,
            'PAYSLIP_UPDATED',
            user.id,
            JSON.stringify({
                payslip_id: payslipId,
                employee_id: currentPayslip.employee_id,
                changes: updates
            }),
            new Date().toISOString()
        ]);

        return NextResponse.json({
            success: true,
            payslip: updateResult.rows[0]
        });

    } catch (error: any) {
        console.error('Error updating payslip:', error);
        return NextResponse.json(
            { error: 'Failed to update payslip', details: error.message },
            { status: 500 }
        );
    }
}
