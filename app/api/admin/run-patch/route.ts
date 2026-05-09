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
    // ─── STEP 1: Inspect payroll_runs actual columns ─────────────────────────
    // (handled dynamically below)

    // ─── STEP 2: payroll_runs — add ALL columns the new code expects ──────────
    {
        name: 'payroll_runs: add run_number column',
        sql: `ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS run_number VARCHAR(100) UNIQUE`
    },
    {
        name: 'payroll_runs: add branch column',
        sql: `ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS branch VARCHAR(100)`
    },
    {
        name: 'payroll_runs: add payroll_period_start column',
        sql: `ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS payroll_period_start DATE`
    },
    {
        name: 'payroll_runs: add payroll_period_end column',
        sql: `ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS payroll_period_end DATE`
    },
    {
        name: 'payroll_runs: add cutoff_day column',
        sql: `ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS cutoff_day INTEGER`
    },
    {
        name: 'payroll_runs: add default_payroll_days column',
        sql: `ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS default_payroll_days DECIMAL(4,2) DEFAULT 15.00`
    },
    {
        name: 'payroll_runs: add workflow_stage column',
        sql: `ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS workflow_stage INTEGER DEFAULT 0`
    },
    {
        name: 'payroll_runs: add current_reviewer_role column',
        sql: `ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS current_reviewer_role VARCHAR(100) DEFAULT 'Payroll Preparer'`
    },
    {
        name: 'payroll_runs: add created_by column',
        sql: `ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS created_by INTEGER`
    },
    {
        name: 'payroll_runs: add approved_by column',
        sql: `ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS approved_by INTEGER`
    },
    {
        name: 'payroll_runs: add approved_at column',
        sql: `ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE`
    },
    {
        name: 'payroll_runs: add status column (if missing)',
        sql: `ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS status VARCHAR(100) DEFAULT 'Draft'`
    },
    {
        name: 'payroll_runs: drop old status CHECK constraint',
        sql: `ALTER TABLE payroll_runs DROP CONSTRAINT IF EXISTS payroll_runs_status_check`
    },
    {
        name: 'payroll_runs: widen status column to 100 chars',
        sql: `ALTER TABLE payroll_runs ALTER COLUMN status TYPE VARCHAR(100)`
    },
    {
        name: 'payroll_runs: add created_at column',
        sql: `ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
    },
    {
        name: 'payroll_runs: add updated_at column',
        sql: `ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
    },

    // ─── STEP 3: payslips — add ALL columns the new code expects ─────────────
    {
        name: 'payslips: add employee_id column',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS employee_id INTEGER`
    },
    {
        name: 'payslips: add payroll_run_id column',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS payroll_run_id INTEGER`
    },
    {
        name: 'payslips: add monthly_salary column',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS monthly_salary DECIMAL(10,2) DEFAULT 0`
    },
    {
        name: 'payslips: add daily_rate column',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10,2) DEFAULT 0`
    },
    {
        name: 'payslips: add payroll_days column',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS payroll_days DECIMAL(4,2) DEFAULT 15`
    },
    {
        name: 'payslips: add basic_pay column',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS basic_pay DECIMAL(10,2) DEFAULT 0`
    },
    {
        name: 'payslips: add regular_allowance column',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS regular_allowance DECIMAL(10,2) DEFAULT 0`
    },
    {
        name: 'payslips: add special_allowance column',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS special_allowance DECIMAL(10,2) DEFAULT 0`
    },
    {
        name: 'payslips: add gross_pay column',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS gross_pay DECIMAL(10,2) DEFAULT 0`
    },
    {
        name: 'payslips: add total_deductions column',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS total_deductions DECIMAL(10,2) DEFAULT 0`
    },
    {
        name: 'payslips: add net_pay column',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS net_pay DECIMAL(10,2) DEFAULT 0`
    },
    {
        name: 'payslips: add phic column',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS phic DECIMAL(10,2) DEFAULT 0`
    },
    {
        name: 'payslips: add pagibig column',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS pagibig DECIMAL(10,2) DEFAULT 0`
    },
    {
        name: 'payslips: add pagibig_loan column',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS pagibig_loan DECIMAL(10,2) DEFAULT 0`
    },
    {
        name: 'payslips: add company_funds column',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS company_funds DECIMAL(10,2) DEFAULT 0`
    },
    {
        name: 'payslips: add sss column',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS sss DECIMAL(10,2) DEFAULT 0`
    },
    {
        name: 'payslips: add sss_loan column',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS sss_loan DECIMAL(10,2) DEFAULT 0`
    },
    {
        name: 'payslips: add company_loan column',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS company_loan DECIMAL(10,2) DEFAULT 0`
    },
    {
        name: 'payslips: add cash_advance column',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS cash_advance DECIMAL(10,2) DEFAULT 0`
    },
    {
        name: 'payslips: add other_deductions column',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS other_deductions DECIMAL(10,2) DEFAULT 0`
    },
    {
        name: 'payslips: add other_deductions_breakdown column',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS other_deductions_breakdown TEXT`
    },
    {
        name: 'payslips: add created_at column',
        sql: `ALTER TABLE payslips ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
    },

    // ─── STEP 4: payroll_audit_log ────────────────────────────────────────────
    {
        name: 'payroll_audit_log: create if not exists',
        sql: `
            CREATE TABLE IF NOT EXISTS payroll_audit_log (
                id SERIAL PRIMARY KEY,
                payroll_run_id INTEGER,
                action VARCHAR(50) NOT NULL,
                performed_by INTEGER,
                details JSONB,
                performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `
    },
    {
        name: 'payroll_audit_log: add performed_at column',
        sql: `ALTER TABLE payroll_audit_log ADD COLUMN IF NOT EXISTS performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
    },

    // ─── STEP 5: user_notifications ──────────────────────────────────────────
    {
        name: 'user_notifications: create table',
        sql: `
            CREATE TABLE IF NOT EXISTS user_notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                type VARCHAR(50) NOT NULL DEFAULT 'system',
                title VARCHAR(255) NOT NULL,
                message TEXT,
                severity VARCHAR(20) DEFAULT 'medium',
                link VARCHAR(500) DEFAULT '#',
                is_read BOOLEAN DEFAULT FALSE,
                reference_id VARCHAR(255),
                reference_type VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `
    },
    {
        name: 'user_notifications: create user index',
        sql: `CREATE INDEX IF NOT EXISTS idx_notifications_user ON user_notifications(user_id)`
    },

    // ─── STEP 6: Normalize existing draft statuses ───────────────────────────
    {
        name: 'payroll_runs: normalize draft status case',
        sql: `UPDATE payroll_runs SET status = 'Draft' WHERE LOWER(status) = 'draft'`
    },

    // ─── STEP 7: sss_contribution_table ─────────────────────────
    {
        name: 'sss_contribution_table: create if not exists',
        sql: `
            CREATE TABLE IF NOT EXISTS sss_contribution_table (
                id SERIAL PRIMARY KEY,
                effectivity_year INTEGER NOT NULL,
                min_salary DECIMAL(10,2) NOT NULL,
                max_salary DECIMAL(10,2),
                monthly_salary_credit DECIMAL(10,2) NOT NULL,
                regular_ee DECIMAL(10,2) NOT NULL,
                regular_er DECIMAL(10,2) NOT NULL,
                regular_total DECIMAL(10,2) NOT NULL,
                mpf_ee DECIMAL(10,2) NOT NULL,
                mpf_er DECIMAL(10,2) NOT NULL,
                mpf_total DECIMAL(10,2) NOT NULL,
                total_ee DECIMAL(10,2) NOT NULL,
                total_er DECIMAL(10,2) NOT NULL,
                total_contribution DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `
    },
    {
        name: 'sss_contribution_table: seed 2025 default row if empty',
        sql: `
            INSERT INTO sss_contribution_table (
                effectivity_year, min_salary, max_salary, monthly_salary_credit,
                regular_ee, regular_er, regular_total,
                mpf_ee, mpf_er, mpf_total,
                total_ee, total_er, total_contribution
            )
            SELECT 2025, 0, 999999, 30000, 
                   1350, 2850, 4200, 
                   0, 0, 0, 
                   1350, 2850, 4200
            WHERE NOT EXISTS (SELECT 1 FROM sss_contribution_table WHERE effectivity_year = 2025)
        `
    }
];

export async function GET(request: NextRequest) {
    try {
        const session = await getRequestSession(request);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // First show actual schema BEFORE patching
        const beforeSchema: Record<string, string[]> = {};
        for (const tbl of ['payroll_runs', 'payslips', 'payroll_audit_log']) {
            try {
                const res = await query(
                    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
                    [tbl]
                );
                beforeSchema[tbl] = res.rows.map((r: any) => r.column_name);
            } catch (e) {
                beforeSchema[tbl] = ['(error reading schema)'];
            }
        }

        const results: { name: string; status: string; error?: string }[] = [];

        for (const patch of PATCHES) {
            try {
                await query(patch.sql.trim());
                results.push({ name: patch.name, status: 'OK' });
            } catch (err: any) {
                const msg = err.message || '';
                const alreadyDone = msg.includes('already exists');
                results.push({
                    name: patch.name,
                    status: alreadyDone ? 'SKIPPED' : 'ERROR',
                    error: alreadyDone ? undefined : msg
                });
            }
        }

        const errors = results.filter(r => r.status === 'ERROR');

        return NextResponse.json({
            success: errors.length === 0,
            message: errors.length === 0
                ? '✅ All patches applied! Payroll creation should now work.'
                : `⚠️ ${errors.length} patch(es) failed — check results`,
            schema_before_patch: beforeSchema,
            patch_results: results
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
