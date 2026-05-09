import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireBranchAuth } from '@/lib/middleware/branch-auth';
import { getCashAdvanceCutoff } from '@/lib/cash-advance-cutoff';

export const dynamic = 'force-dynamic';

/**
 * Cash Advance Summary API
 * GET – Returns aggregated stats for the dashboard
 */

export async function GET(request: NextRequest) {
    try {
        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;
        const [user] = auth;

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employee_id');

        const cutoff = getCashAdvanceCutoff();

        let whereClause = `WHERE ca.status != 'Deleted'`;
        const params: any[] = [];
        let idx = 1;

        if (employeeId) {
            whereClause += ` AND ca.employee_id = $${idx++}`;
            params.push(parseInt(employeeId));
        }

        // Overall stats
        const statsRes = await query(`
            SELECT
                COUNT(*) as total_requests,
                COUNT(CASE WHEN ca.status = 'Pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN ca.status = 'Approved' THEN 1 END) as approved_count,
                COUNT(CASE WHEN ca.status = 'Rejected' THEN 1 END) as rejected_count,
                COALESCE(SUM(CASE WHEN ca.status = 'Approved' THEN ca.approved_amount ELSE 0 END), 0) as total_approved_amount,
                COALESCE(SUM(CASE WHEN ca.status = 'Pending' THEN ca.requested_amount ELSE 0 END), 0) as total_pending_amount
            FROM cash_advances ca
            ${whereClause}
        `, params);

        // Current cutoff stats
        const cutoffParams = [...params];
        cutoffParams.push(cutoff.label);
        const cutoffRes = await query(`
            SELECT
                COUNT(*) as cutoff_requests,
                COALESCE(SUM(CASE WHEN ca.status = 'Approved' THEN ca.approved_amount ELSE 0 END), 0) as cutoff_approved,
                COALESCE(SUM(CASE WHEN ca.status = 'Pending' THEN ca.requested_amount ELSE 0 END), 0) as cutoff_pending
            FROM cash_advances ca
            ${whereClause} AND ca.cutoff_period = $${idx}
        `, cutoffParams);

        const stats = statsRes.rows[0] || {};
        const cutoffStats = cutoffRes.rows[0] || {};

        return NextResponse.json({
            total_requests: Number(stats.total_requests || 0),
            pending_count: Number(stats.pending_count || 0),
            approved_count: Number(stats.approved_count || 0),
            rejected_count: Number(stats.rejected_count || 0),
            total_approved_amount: Number(stats.total_approved_amount || 0),
            total_pending_amount: Number(stats.total_pending_amount || 0),
            current_cutoff: {
                label: cutoff.label,
                display: cutoff.display,
                requests: Number(cutoffStats.cutoff_requests || 0),
                approved_amount: Number(cutoffStats.cutoff_approved || 0),
                pending_amount: Number(cutoffStats.cutoff_pending || 0),
            }
        });

    } catch (error: any) {
        console.error('[Cash Advance Summary] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch summary', details: error.message }, { status: 500 });
    }
}
