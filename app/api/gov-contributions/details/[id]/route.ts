import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

function toAmount(value: any): number {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : 0;
}

function parseSalaryInfo(rawSalaryInfo: any): any {
    if (!rawSalaryInfo) return {};
    if (typeof rawSalaryInfo === 'object') return rawSalaryInfo;
    if (typeof rawSalaryInfo !== 'string') return {};

    try {
        return JSON.parse(rawSalaryInfo);
    } catch {
        return {};
    }
}

async function recalculateReportTotals(reportId: string | number) {
    const sumRes = await query(`
        SELECT 
            COALESCE(SUM(ee_share), 0) as total_ee, 
            COALESCE(SUM(er_share), 0) as total_er, 
            COALESCE(SUM(ec), 0) as total_ec, 
            COALESCE(SUM(mpf_er), 0) as total_mpf_er,
            COALESCE(SUM(mpf_ee), 0) as total_mpf_ee,
            COALESCE(SUM(loan_deduction), 0) as total_loan,
            COUNT(*) as employee_count
        FROM gov_contribution_details
        WHERE report_id = $1
    `, [reportId]);

    const totals = sumRes.rows[0] || {};
    const newTotals = {
        total_ee: toAmount(totals.total_ee),
        total_er: toAmount(totals.total_er),
        total_ec: toAmount(totals.total_ec),
        total_mpf_er: toAmount(totals.total_mpf_er),
        total_mpf_ee: toAmount(totals.total_mpf_ee),
        total_loan: toAmount(totals.total_loan),
        employee_count: Number(totals.employee_count || 0)
    };

    await query(`
        UPDATE gov_contribution_reports
        SET total_ee = $1,
            total_er = $2,
            total_ec = $3,
            total_loan = $4,
            total_mpf_er = $5,
            total_mpf_ee = $6,
            employee_count = $7,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
    `, [
        newTotals.total_ee,
        newTotals.total_er,
        newTotals.total_ec,
        newTotals.total_loan,
        newTotals.total_mpf_er,
        newTotals.total_mpf_ee,
        newTotals.employee_count,
        reportId
    ]);

    return newTotals;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const sessionId = req.headers.get('x-session-id');
        if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const sessionRes = await query("SELECT user_id FROM sessions WHERE id = $1", [sessionId]);
        if (sessionRes.rowCount === 0) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const detailId = params.id;
        const body = await req.json();
        const { ee_share, er_share, ec, mpf_er, loan_deduction } = body;

        // 1. Get the current detail record to find the parent report and employee
        const detailRes = await query(`
            SELECT d.report_id, d.employee_id, r.status, r.contribution_type 
            FROM gov_contribution_details d
            JOIN gov_contribution_reports r ON d.report_id = r.id
            WHERE d.id = $1
        `, [detailId]);

        if (detailRes.rowCount === 0) return NextResponse.json({ error: 'Detail not found' }, { status: 404 });

        const { report_id, employee_id, status, contribution_type } = detailRes.rows[0];

        // Ensure report allows edits (Draft or Pending or Rejected)
        if (status === 'Approved') {
            return NextResponse.json({ error: 'Cannot edit an approved report' }, { status: 400 });
        }

        // 2. Update the specific detail record
        await query(`
            UPDATE gov_contribution_details 
            SET ee_share = $1, er_share = $2, ec = $4, mpf_er = $5, loan_deduction = $6
            WHERE id = $3
        `, [
            toAmount(ee_share),
            toAmount(er_share),
            detailId, 
            toAmount(ec),
            toAmount(mpf_er),
            toAmount(loan_deduction)
        ]);

        // 3. Recalculate the master report totals
        const newTotals = await recalculateReportTotals(report_id);

        // 4. Sync to Employee's Compensation & Benefits profile (non-critical — don't fail if this errors)
        try {
            const empRes = await query("SELECT salary_info FROM employees WHERE id = $1", [employee_id]);
            if (empRes.rowCount > 0) {
                const salaryInfo = parseSalaryInfo(empRes.rows[0].salary_info);

                if (!salaryInfo.deductions) salaryInfo.deductions = {};

                // Map the report type to the json deduction keys
                if (contribution_type === 'SSS') {
                    salaryInfo.deductions.sss = toAmount(ee_share);
                } else if (contribution_type === 'PhilHealth') {
                    salaryInfo.deductions.phic = toAmount(ee_share);
                    salaryInfo.deductions.phic_er = toAmount(er_share);
                } else if (contribution_type === 'Pag-IBIG') {
                    salaryInfo.deductions.pagibig = toAmount(ee_share);
                    salaryInfo.deductions.pagibig_er = toAmount(er_share);
                }

                // Save back to employee
                await query("UPDATE employees SET salary_info = $1 WHERE id = $2", [JSON.stringify(salaryInfo), employee_id]);
            }
        } catch (syncErr) {
            // Log but don't fail the entire request over a sync issue
            console.warn('Non-critical: Could not sync contribution to employee salary_info:', syncErr);
        }

        return NextResponse.json({ success: true, ...newTotals });

    } catch (error) {
        console.error('API Error [GovContribDetails PATCH]:', error);
        return NextResponse.json({ error: 'Server error updating contribution' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const sessionId = req.headers.get('x-session-id');
        if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const sessionRes = await query("SELECT user_id FROM sessions WHERE id = $1", [sessionId]);
        if (sessionRes.rowCount === 0) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const detailId = params.id;

        // Get the parent report_id before deleting
        const detailRes = await query(`
            SELECT d.report_id, r.status
            FROM gov_contribution_details d
            JOIN gov_contribution_reports r ON d.report_id = r.id
            WHERE d.id = $1
        `, [detailId]);

        if (detailRes.rowCount === 0) return NextResponse.json({ error: 'Detail not found' }, { status: 404 });

        const { report_id, status } = detailRes.rows[0];

        if (status === 'Approved') {
            return NextResponse.json({ error: 'Cannot delete from an approved report' }, { status: 400 });
        }

        // Delete the record
        await query('DELETE FROM gov_contribution_details WHERE id = $1', [detailId]);

        await recalculateReportTotals(report_id);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('API Error [GovContribDetails DELETE]:', error);
        return NextResponse.json({ error: 'Server error deleting contribution detail' }, { status: 500 });
    }
}
