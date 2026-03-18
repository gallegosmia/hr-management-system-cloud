import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const sessionId = req.headers.get('x-session-id');
        if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const sessionRes = await query("SELECT user_id FROM sessions WHERE id = $1", [sessionId]);
        if (sessionRes.rowCount === 0) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const detailId = params.id;
        const body = await req.json();
        const { ee_share, er_share, ec, mpf_er } = body;

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
        if (ec !== undefined || mpf_er !== undefined) {
            await query(`
                UPDATE gov_contribution_details 
                SET ee_share = $1, er_share = $2, ec = $4, mpf_er = $5
                WHERE id = $3
            `, [ee_share, er_share, detailId, ec ?? 0, mpf_er ?? 0]);
        } else {
            await query(`
                UPDATE gov_contribution_details 
                SET ee_share = $1, er_share = $2
                WHERE id = $3
            `, [ee_share, er_share, detailId]);
        }

        // 3. Recalculate the master report totals
        const sumRes = await query(`
            SELECT COALESCE(SUM(ee_share), 0) as total_ee, COALESCE(SUM(er_share), 0) as total_er, COALESCE(SUM(ec), 0) as total_ec, COALESCE(SUM(mpf_er), 0) as total_mpf_er
            FROM gov_contribution_details
            WHERE report_id = $1
        `, [report_id]);

        let newTotalEE = 0;
        let newTotalER = 0;
        let newTotalEC = 0;
        let newTotalMpfEr = 0;

        if (sumRes.rows.length > 0 && typeof sumRes.rows[0].total_ee !== 'undefined') {
            newTotalEE = Number(sumRes.rows[0].total_ee) || 0;
            newTotalER = Number(sumRes.rows[0].total_er) || 0;
            newTotalEC = Number(sumRes.rows[0].total_ec) || 0;
            newTotalMpfEr = Number(sumRes.rows[0].total_mpf_er) || 0;
        } else {
            // Local DB Fallback (Doesn't support native SQL SUM grouping)
            newTotalEE = sumRes.rows.reduce((sum, r) => sum + Number(r.ee_share || 0), 0);
            newTotalER = sumRes.rows.reduce((sum, r) => sum + Number(r.er_share || 0), 0);
            newTotalEC = sumRes.rows.reduce((sum, r) => sum + Number(r.ec || 0), 0);
            newTotalMpfEr = sumRes.rows.reduce((sum, r) => sum + Number(r.mpf_er || 0), 0);
        }

        /* 
           Not updating mpf_er directly on gov_contribution_reports yet unless we know 
           it exists as a column. We will at least update total_ee, total_er, total_ec. 
           We can safely omit mpf_er from the master table UPDATE statement to prevent 
           SQL crashes on missing columns, as the frontend calculates it live from details anyway.
        */
        await query(`
            UPDATE gov_contribution_reports
            SET total_ee = $1, total_er = $2, total_ec = $4
            WHERE id = $3
        `, [newTotalEE, newTotalER, report_id, newTotalEC]);

        // 4. Sync to Employee's Compensation & Benefits profile (non-critical — don't fail if this errors)
        try {
            const empRes = await query("SELECT salary_info FROM employees WHERE id = $1", [employee_id]);
            if (empRes.rowCount > 0) {
                let salaryInfo = empRes.rows[0].salary_info || {};

                if (!salaryInfo.deductions) salaryInfo.deductions = {};

                // Map the report type to the json deduction keys
                if (contribution_type === 'SSS') {
                    salaryInfo.deductions.sss = Number(ee_share);
                } else if (contribution_type === 'PhilHealth') {
                    salaryInfo.deductions.phic = Number(ee_share);
                    salaryInfo.deductions.phic_er = Number(er_share);
                } else if (contribution_type === 'Pag-IBIG') {
                    salaryInfo.deductions.pagibig = Number(ee_share);
                    salaryInfo.deductions.pagibig_er = Number(er_share);
                }

                // Save back to employee
                await query("UPDATE employees SET salary_info = $1 WHERE id = $2", [JSON.stringify(salaryInfo), employee_id]);
            }
        } catch (syncErr) {
            // Log but don't fail the entire request over a sync issue
            console.warn('Non-critical: Could not sync contribution to employee salary_info:', syncErr);
        }

        return NextResponse.json({ success: true, total_ee: newTotalEE, total_er: newTotalER });

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

        // Recalculate master report totals
        const sumRes = await query(`
            SELECT COALESCE(SUM(ee_share), 0) as total_ee, COALESCE(SUM(er_share), 0) as total_er,
                   COUNT(*) as employee_count
            FROM gov_contribution_details
            WHERE report_id = $1
        `, [report_id]);

        const { total_ee: newTotalEE, total_er: newTotalER, employee_count } = sumRes.rows[0];

        await query(`
            UPDATE gov_contribution_reports
            SET total_ee = $1, total_er = $2, employee_count = $3
            WHERE id = $4
        `, [newTotalEE, newTotalER, employee_count, report_id]);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('API Error [GovContribDetails DELETE]:', error);
        return NextResponse.json({ error: 'Server error deleting contribution detail' }, { status: 500 });
    }
}
