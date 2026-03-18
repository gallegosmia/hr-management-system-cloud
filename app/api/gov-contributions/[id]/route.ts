import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const sessionId = req.headers.get('x-session-id');
        if (!sessionId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const reportId = params.id;

        // Fetch Main Report
        const reportRes = await query(`
            SELECT r.*, 
                   c.username as created_by_name,
                   a.username as approved_by_name
            FROM gov_contribution_reports r
            LEFT JOIN users c ON r.created_by = c.id
            LEFT JOIN users a ON r.approved_by = a.id
            WHERE r.id = $1
        `, [reportId]);

        if (reportRes.rowCount === 0) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // Fetch Details with Employee Names
        const detailsRes = await query(`
            SELECT d.*, 
                   e.last_name, e.first_name, e.middle_name, e.salary_info
            FROM gov_contribution_details d
            JOIN employees e ON d.employee_id = e.id
            WHERE d.report_id = $1
            ORDER BY e.last_name ASC, e.first_name ASC
        `, [reportId]);

        return NextResponse.json({
            report: reportRes.rows[0],
            details: detailsRes.rows
        });

    } catch (error) {
        console.error('API Error [GovContributions/[id] GET]', error);
        return NextResponse.json({ error: 'Failed to fetch contribution details' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const sessionId = req.headers.get('x-session-id');
        if (!sessionId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sessionRes = await query("SELECT user_id FROM sessions WHERE id = $1", [sessionId]);
        if (sessionRes.rowCount === 0) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = sessionRes.rows[0].user_id;
        const userRes = await query("SELECT role FROM users WHERE id = $1", [userId]);
        const role = userRes.rows[0].role;

        const body = await req.json();
        const { status } = body;
        const reportId = params.id;

        // Fetch the report to check its branch_id
        const reportRes = await query("SELECT branch_id FROM gov_contribution_reports WHERE id = $1", [reportId]);
        if (reportRes.rowCount === 0) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }
        const reportBranch = reportRes.rows[0].branch_id;

        // Validation Rules
        if (status === 'Pending') {
            await query("UPDATE gov_contribution_reports SET status = 'Pending', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [reportId]);

            try {
                // Create a notification for the branch managers
                const reportTypeRes = await query("SELECT contribution_type, payroll_period FROM gov_contribution_reports WHERE id = $1", [reportId]);
                const cType = reportTypeRes.rows[0]?.contribution_type;
                const cPeriod = reportTypeRes.rows[0]?.payroll_period;

                const branchManagers = await query(`SELECT id FROM users WHERE (role = 'Manager' OR role = 'Operations Manager') AND (branch = $1 OR branch = 'All')`, [reportBranch]);

                if (branchManagers.rowCount > 0) {
                    await query(`
                        INSERT INTO notifications (user_id, message, type, link)
                        SELECT id, $1, 'System', $2
                        FROM users 
                        WHERE (role = 'Manager' OR role = 'Operations Manager') AND (branch = $3 OR branch = 'All')
                    `, [`HR submitted ${cType} Contributions for ${cPeriod} for your review.`, `/gov-contributions/${reportId}`, reportBranch]);
                }
            } catch (notifyErr) {
                console.warn('Failed to send notification (manager might not exist):', notifyErr);
            }
        }
        else if (status === 'Approved' || status === 'Rejected') {
            if (role !== 'President' && role !== 'Vice President' && role !== 'Operations Manager' && role !== 'Manager') {
                return NextResponse.json({ error: 'Only Managers can approve or reject reports' }, { status: 403 });
            }

            // Strictly enforce Branch Manager rule
            if (role === 'Operations Manager' || role === 'Manager') {
                const sessionBranchRes = await query("SELECT selected_branch FROM sessions WHERE id = $1", [sessionId]);
                const managerBranch = sessionBranchRes.rows[0]?.selected_branch;
                if (managerBranch !== reportBranch) {
                    return NextResponse.json({ error: `Unauthorized: You can only approve reports for ${managerBranch}` }, { status: 403 });
                }
            }

            await query("UPDATE gov_contribution_reports SET status = $1, approved_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3", [status, userId, reportId]);
        }
        else {
            return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 });
        }

        return NextResponse.json({ success: true, status });

    } catch (error) {
        console.error('API Error [GovContributions/[id] PATCH]', error);
        return NextResponse.json({ error: 'Failed to update report status' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const sessionId = req.headers.get('x-session-id');
        if (!sessionId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sessionRes = await query("SELECT user_id FROM sessions WHERE id = $1", [sessionId]);
        if (sessionRes.rowCount === 0) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = sessionRes.rows[0].user_id;
        const userRes = await query("SELECT role FROM users WHERE id = $1", [userId]);
        const role = String(userRes.rows[0].role || '').trim().toUpperCase();

        if (role !== 'HR' && role !== 'ADMIN' && role !== 'PRESIDENT') {
            return NextResponse.json({ error: 'Forbidden. Only HR and Admins can delete reports.' }, { status: 403 });
        }

        const reportId = params.id;

        // Check existence
        const reportCheck = await query(`SELECT status FROM gov_contribution_reports WHERE id = $1`, [reportId]);
        if (reportCheck.rowCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        await query(`DELETE FROM gov_contribution_details WHERE report_id = $1`, [reportId]);
        await query(`DELETE FROM gov_contribution_reports WHERE id = $1`, [reportId]);

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        console.error('API Error [GovContributions/[id] DELETE]', error);
        return NextResponse.json({ error: 'Failed to delete report: ' + error.message }, { status: 500 });
    }
}
