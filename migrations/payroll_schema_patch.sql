-- ============================================================
-- PATCH: payroll_schema_patch.sql
-- Run this against your Neon cloud database to bring it up
-- to date with the current application code.
-- ============================================================

-- 1. Add missing columns to payroll_runs
ALTER TABLE payroll_runs
    ADD COLUMN IF NOT EXISTS workflow_stage INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS current_reviewer_role VARCHAR(100) DEFAULT 'Payroll Preparer',
    ADD COLUMN IF NOT EXISTS default_payroll_days DECIMAL(4,2) DEFAULT 15.00;

-- 2. Drop old restrictive status CHECK and replace with permissive one
ALTER TABLE payroll_runs DROP CONSTRAINT IF EXISTS payroll_runs_status_check;
ALTER TABLE payroll_runs
    ALTER COLUMN status TYPE VARCHAR(100),
    ALTER COLUMN status SET DEFAULT 'Draft';

-- 3. Add missing columns to payslips
ALTER TABLE payslips
    ADD COLUMN IF NOT EXISTS other_deductions_breakdown TEXT,
    ADD COLUMN IF NOT EXISTS total_gross_pay DECIMAL(10,2) DEFAULT 0;

-- 4. Add performed_at column to payroll_audit_log (alias for created_at)
ALTER TABLE payroll_audit_log
    ADD COLUMN IF NOT EXISTS performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 5. Ensure user_notifications table exists (for leave/loan/payroll notifications)
CREATE TABLE IF NOT EXISTS user_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    reference_id VARCHAR(255),
    reference_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON user_notifications(is_read);

-- 6. Normalize existing statuses to title case (if any exist as lowercase)
UPDATE payroll_runs SET status = 'Draft' WHERE status = 'draft';
UPDATE payroll_runs SET status = 'Approved' WHERE status = 'approved';

-- Verify
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('payroll_runs', 'payslips', 'payroll_audit_log')
ORDER BY table_name, ordinal_position;
