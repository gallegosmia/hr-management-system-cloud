/**
 * Auto-Release Payroll API
 * GET /api/payroll/auto-release - Automatically release payrolls when pay_period_end == today
 * This endpoint can be triggered by:
 * - Vercel Cron (scheduled daily)
 * - Manual trigger
 * - Page load check
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
    try {
        // Get today's date (YYYY-MM-DD format)
        const today = new Date().toISOString().split('T')[0];

        // Find all payrolls with status 'For Release' where pay_period_end == today
        const payrollsToRelease = await query(`
            SELECT id, run_number, payroll_period_end
            FROM payroll_runs
            WHERE status = 'For Release'
            AND DATE(payroll_period_end) = DATE($1)
        `, [today]);

        if (payrollsToRelease.rows.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No payrolls to auto-release today',
                count: 0
            });
        }

        // Update all matching payrolls to 'Released'
        const releasedIds: number[] = [];
        for (const payroll of payrollsToRelease.rows) {
            await query(`
                UPDATE payroll_runs
                SET status = 'Released',
                    release_date = NOW(),
                    updated_at = NOW()
                WHERE id = $1
            `, [payroll.id]);

            // Log the auto-release action
            await query(`
                INSERT INTO payroll_audit_log (payroll_run_id, action, performed_by, details, performed_at)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                payroll.id,
                'AUTO_RELEASED',
                null, // System action, no user
                JSON.stringify({
                    run_number: payroll.run_number,
                    release_date: today,
                    trigger: 'auto-release'
                }),
                new Date().toISOString()
            ]);

            releasedIds.push(payroll.id);
        }

        return NextResponse.json({
            success: true,
            message: `Auto-released ${releasedIds.length} payroll(s)`,
            count: releasedIds.length,
            payrollIds: releasedIds
        });

    } catch (error: any) {
        console.error('Error in auto-release:', error);
        return NextResponse.json(
            { error: 'Failed to auto-release payrolls', details: error.message },
            { status: 500 }
        );
    }
}
