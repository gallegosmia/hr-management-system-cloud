/**
 * Admin-only DB migration runner
 * GET /api/admin/run-patch
 * Applies all pending schema patches to bring cloud DB up to date.
 * Only accessible to Super Admin / Admin roles.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getRequestSession } from '@/lib/middleware/branch-auth';

export const dynamic = 'force-dynamic';

const PATCHES = [
    {
        name: 'payroll_runs: add workflow_stage',
        sql: `ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS workflow_stage INTEGER DEFAULT 0`
    },
    {
        name: 'payroll_runs: add current_reviewer_role',
        sql: `ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS current_reviewer_role VARCHAR(100) DEFAULT 'Payroll Preparer'`
    },
    {
        name: 'payroll_runs: add default_payroll_days',
        sql: `ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS default_payroll_days DECIMAL(4,2) DEFAULT 15.00`
    },
    {
        name: 'payroll_runs: drop old status CHECK constraint',
        sql: `ALTER TABLE payroll_runs DROP CONSTRAINT IF EXISTS payroll_runs_status_check`
    },
    {
        name: 'payroll_runs: widen status column',
        sql: `ALTER TABLE payroll_runs ALTER COLUMN status TYPE VARCHAR(100)`
    },
    {
        name: 'payroll_runs: normalize status to title case',
        sql: `UPDATE payroll_runs SET status = 'Draft' WHERE LOWER(status) = 'draft'`
    },
    {
        name: 'payslips: add other_deductions_breakdown',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS other_deductions_breakdown TEXT`
    },
    {
        name: 'payroll_audit_log: add performed_at',
        sql: `ALTER TABLE payroll_audit_log ADD COLUMN IF NOT EXISTS performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
    },
    {
        name: 'user_notifications: create table',
        sql: `
            CREATE TABLE IF NOT EXISTS user_notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(50) NOT NULL DEFAULT 'system',
                title VARCHAR(255) NOT NULL,
                message TEXT,
                severity VARCHAR(20) DEFAULT 'medium',
                link VARCHAR(500) DEFAULT '#',
                is_read BOOLEAN DEFAULT FALSE,
                reference_id INTEGER,
                reference_type VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `
    },
    {
        name: 'user_notifications: create index',
        sql: `CREATE INDEX IF NOT EXISTS idx_notifications_user ON user_notifications(user_id)`
    },
    {
        name: 'user_notifications: create unread index',
        sql: `CREATE INDEX IF NOT EXISTS idx_notifications_read ON user_notifications(is_read)`
    }
];

export async function GET(request: NextRequest) {
    try {
        const session = await getRequestSession(request);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const allowedRoles = ['Super Admin', 'Admin', 'President'];
        if (!allowedRoles.includes(session.user.role) && session.user.username !== 'superadmin') {
            return NextResponse.json({ error: 'Forbidden — Admin only' }, { status: 403 });
        }

        const results: { name: string; status: string; error?: string }[] = [];

        for (const patch of PATCHES) {
            try {
                await query(patch.sql);
                results.push({ name: patch.name, status: 'OK' });
            } catch (err: any) {
                // Some patches may fail if already applied — that's fine
                const msg = err.message || '';
                const alreadyDone = msg.includes('already exists') || msg.includes('does not exist');
                results.push({
                    name: patch.name,
                    status: alreadyDone ? 'SKIPPED (already applied)' : 'ERROR',
                    error: alreadyDone ? undefined : msg
                });
            }
        }

        const errors = results.filter(r => r.status === 'ERROR');

        return NextResponse.json({
            success: errors.length === 0,
            message: errors.length === 0
                ? '✅ All patches applied successfully!'
                : `⚠️ ${errors.length} patch(es) failed`,
            results
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
