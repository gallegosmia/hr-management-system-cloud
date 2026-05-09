/**
 * Payslip Update API Route
 * PATCH /api/payroll/runs/[id]/payslips/[payslipId] - Update individual payslip
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireBranchAuth } from '@/lib/middleware/branch-auth';
import { canAccessPayroll, canEditPayrollDays } from '@/lib/payroll-access';
import { computePayslip, validatePayrollDays } from '@/lib/payroll-calculations';

// Helper: safely parse any value as a number, defaulting to 0
const n = (v: any): number => { const x = parseFloat(v); return isNaN(x) ? 0 : x; };

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string; payslipId: string } }
) {
    try {
        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;
        const [user] = auth;

        const payrollRunId = Number(params.id);
        const payslipId = Number(params.payslipId);

        if (!Number.isInteger(payrollRunId) || !Number.isInteger(payslipId)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }

        const body = await request.json();
        const { payrollDays, allowances, deductions } = body;

        // Fetch payroll run
        const runResult = await query(`SELECT * FROM payroll_runs WHERE id = $1`, [payrollRunId]);
        if (runResult.rows.length === 0) {
            return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
        }
        const payrollRun = runResult.rows[0];

        if (payrollRun.status === 'locked') {
            return NextResponse.json({ error: 'Cannot edit locked payroll' }, { status: 400 });
        }
        if (!canAccessPayroll(user, payrollRun.branch)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        if (!canEditPayrollDays(user)) {
            return NextResponse.json({ error: 'No permission to edit payroll' }, { status: 403 });
        }

        // Fetch payslip — simple SELECT, no JOIN (SQLite-safe)
        const payslipResult = await query(
            `SELECT * FROM payslips WHERE id = $1 AND payroll_run_id = $2`,
            [payslipId, payrollRunId]
        );
        if (payslipResult.rows.length === 0) {
            return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });
        }
        const currentPayslip = payslipResult.rows[0];

        // Build update object from request body
        const updates: any = {};

        if (payrollDays !== undefined) {
            const periodStart = new Date(payrollRun.payroll_period_start || payrollRun.period_start);
            const periodEnd   = new Date(payrollRun.payroll_period_end   || payrollRun.period_end);
            const validation  = validatePayrollDays(payrollDays, periodStart, periodEnd);
            if (!validation.valid) {
                return NextResponse.json({ error: validation.error }, { status: 400 });
            }
            updates.payroll_days = payrollDays;
        }

        if (allowances) {
            if (allowances.regular     !== undefined) updates.regular_allowance = allowances.regular;
            if (allowances.special     !== undefined) updates.special_allowance = allowances.special;
            if (allowances.other       !== undefined) updates.other_earnings    = allowances.other;
            if (allowances.holiday     !== undefined) updates.holiday_pay       = allowances.holiday;
            if (allowances.holiday_days!== undefined) updates.holiday_days      = allowances.holiday_days;
        }

        if (deductions) {
            if (deductions.phic        !== undefined) updates.phic             = deductions.phic;
            if (deductions.pagibig     !== undefined) updates.pagibig          = deductions.pagibig;
            if (deductions.pagibigLoan !== undefined) updates.pagibig_loan     = deductions.pagibigLoan;
            if (deductions.companyFunds!== undefined) updates.company_funds    = deductions.companyFunds;
            if (deductions.sss         !== undefined) updates.sss              = deductions.sss;
            if (deductions.sssLoan     !== undefined) updates.sss_loan         = deductions.sssLoan;
            if (deductions.companyLoan !== undefined) updates.company_loan     = deductions.companyLoan;
            if (deductions.cashAdvance !== undefined) updates.cash_advance     = deductions.cashAdvance;
            if (deductions.other       !== undefined) updates.other_deductions = deductions.other;
        }

        // Merge current values with updates
        const merged = { ...currentPayslip, ...updates };

        // Recompute — all inputs explicitly coerced to numbers to prevent NaN
        const cutoff = n(payrollRun.cutoff_day) as 15 | 30 | 31;
        const computed = computePayslip({
            dailyRate: n(merged.daily_rate),
            payrollDays: n(merged.payroll_days),
            allowances: {
                regular: n(merged.regular_allowance),
                special: n(merged.special_allowance),
                holiday: n(merged.holiday_pay),
                other:   n(merged.other_earnings),
            },
            deductions: {
                phic:         n(merged.phic),
                pagibig:      n(merged.pagibig),
                pagibigLoan:  n(merged.pagibig_loan),
                companyFunds: n(merged.company_funds),
                sss:          n(merged.sss),
                sssLoan:      n(merged.sss_loan),
                companyLoan:  n(merged.company_loan),
                cashAdvance:  n(merged.cash_advance),
                other:        n(merged.other_deductions),
            }
        }, cutoff);

        // Save to database — two-step (UPDATE then SELECT) to avoid RETURNING * issues in SQLite
        await query(`
            UPDATE payslips
            SET
                payroll_days      = $1,
                basic_pay         = $2,
                regular_allowance = $3,
                special_allowance = $4,
                other_earnings    = $5,
                holiday_pay       = $6,
                holiday_days      = $7,
                gross_pay         = $8,
                phic              = $9,
                pagibig           = $10,
                pagibig_loan      = $11,
                company_funds     = $12,
                sss               = $13,
                sss_loan          = $14,
                company_loan      = $15,
                cash_advance      = $16,
                other_deductions  = $17,
                total_deductions  = $18,
                net_pay           = $19
            WHERE id = $20
        `, [
            n(merged.payroll_days),
            computed.basicPay,
            computed.breakdown.earnings.regularAllowance,
            computed.breakdown.earnings.specialAllowance,
            computed.breakdown.earnings.otherEarnings,
            computed.breakdown.earnings.holidayPay,
            n(merged.holiday_days),
            computed.grossPay,
            computed.breakdown.deductions.phic        || 0,
            computed.breakdown.deductions.pagibig     || 0,
            computed.breakdown.deductions.pagibigLoan || 0,
            computed.breakdown.deductions.companyFunds|| 0,
            computed.breakdown.deductions.sss         || 0,
            computed.breakdown.deductions.sssLoan     || 0,
            computed.breakdown.deductions.companyLoan || 0,
            computed.breakdown.deductions.cashAdvance || 0,
            computed.breakdown.deductions.other       || 0,
            computed.totalDeductions,
            computed.netPay,
            payslipId
        ]);

        // Fetch the updated row separately (works on ALL SQLite versions)
        const fetchResult = await query(`SELECT * FROM payslips WHERE id = $1`, [payslipId]);


        // Audit log — non-blocking, never crashes the save
        try {
            await query(`
                INSERT INTO payroll_audit_log (payroll_run_id, action, performed_by, details, performed_at)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                payrollRunId, 'PAYSLIP_UPDATED', user.id,
                JSON.stringify({ payslip_id: payslipId, changes: updates }),
                new Date().toISOString()
            ]);
        } catch (_) { /* audit failure never blocks the save */ }

        const saved = fetchResult.rows[0] || merged;
        return NextResponse.json({ success: true, payslip: saved });

    } catch (error: any) {
        console.error('Error updating payslip:', error);
        return NextResponse.json(
            { error: 'Failed to update payslip', details: error.message },
            { status: 500 }
        );
    }
}
