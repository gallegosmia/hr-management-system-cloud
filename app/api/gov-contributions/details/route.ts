import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

/**
 * POST /api/gov-contributions/details
 * Manually add an employee row to an existing gov contribution report.
 * Works for SSS, PhilHealth, and Pag-IBIG.
 */
export async function POST(request: NextRequest) {
    try {
        const sessionId = request.headers.get('x-session-id');
        if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const sessionRes = await query('SELECT user_id FROM sessions WHERE id = $1', [sessionId]);
        if (sessionRes.rowCount === 0) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const {
            report_id,
            last_name,
            first_name,
            government_number = '',
            ee_share = 0,
            er_share = 0,
            ec = 0,
            mpf_er = 0,
            loan_deduction = 0,
        } = body;

        if (!report_id || !last_name || !first_name) {
            return NextResponse.json({ error: 'report_id, last_name, and first_name are required' }, { status: 400 });
        }

        // Fetch report to confirm it exists and isn't Approved
        const reportRes = await query('SELECT id, status, contribution_type FROM gov_contribution_reports WHERE id = $1', [report_id]);
        if (reportRes.rows.length === 0) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        const rep = reportRes.rows[0];
        if (rep.status === 'Approved') return NextResponse.json({ error: 'Cannot modify an approved report' }, { status: 400 });

        const salary = Number(ee_share) + Number(er_share);
        const rate_used = JSON.stringify({ manual_entry: true, added_by: 'HR' });

        // Insert the new detail row with employee_id = null (manual / non-system employee)
        const insert = await query(
            `INSERT INTO gov_contribution_details
                (report_id, employee_id, government_number, salary,
                 er_share, ee_share, ec, mpf_er, mpf_ee, loan_deduction,
                 config_id_used, rate_used, computation_date,
                 last_name, first_name)
             VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, 0, $8, 0, $9, NOW(), $10, $11)
             RETURNING id`,
            [
                report_id, government_number, salary,
                Number(er_share), Number(ee_share), Number(ec), Number(mpf_er),
                Number(loan_deduction), rate_used,
                last_name.toUpperCase().trim(), first_name.trim()
            ]
        );

        // Recalculate report totals
        const totals = await query(
            `SELECT
                COALESCE(SUM(ee_share),0) as total_ee,
                COALESCE(SUM(er_share),0) as total_er,
                COALESCE(SUM(ec),0) as total_ec,
                COALESCE(SUM(loan_deduction),0) as total_loan,
                COUNT(*) as employee_count
             FROM gov_contribution_details WHERE report_id = $1`,
            [report_id]
        );
        const t = totals.rows[0];
        await query(
            `UPDATE gov_contribution_reports
             SET total_ee=$1, total_er=$2, total_ec=$3, total_loan=$4, employee_count=$5
             WHERE id=$6`,
            [t.total_ee, t.total_er, t.total_ec, t.total_loan, t.employee_count, report_id]
        );

        return NextResponse.json({ success: true, detail_id: insert.rows[0].id });
    } catch (error: any) {
        console.error('[GovContrib Details POST]', error);
        return NextResponse.json({ error: error.message || 'Failed to add employee' }, { status: 500 });
    }
}
