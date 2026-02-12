-- Payroll Module Migration Script
-- Migrates from old attendance-based payroll to new pay-based payroll system
-- Date: February 9, 2026

-- ============================================
-- STEP 1: Backup existing payroll data (if needed)
-- ============================================

-- Create backup tables (optional - uncomment if you want to preserve old data)
-- CREATE TABLE payroll_runs_backup AS SELECT * FROM payroll_runs;
-- CREATE TABLE payslips_backup AS SELECT * FROM payslips;

-- ============================================
-- STEP 2: Drop old payroll tables
-- ============================================

DROP TABLE IF EXISTS payslips CASCADE;
DROP TABLE IF EXISTS payroll_runs CASCADE;

-- ============================================
-- STEP 3: Create new payroll tables
-- ============================================

-- 3.1 Payroll Runs Table (New Schema)
CREATE TABLE payroll_runs (
    id SERIAL PRIMARY KEY,
    run_number VARCHAR(50) UNIQUE NOT NULL,
    branch VARCHAR(100) NOT NULL,
    payroll_period_start DATE NOT NULL,
    payroll_period_end DATE NOT NULL,
    cutoff_day INTEGER NOT NULL CHECK (cutoff_day IN (15, 30, 31)),
    default_payroll_days DECIMAL(4,2) DEFAULT 15.00,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'locked')),
    
    -- Audit fields
    created_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    locked_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3.2 Payslips Table (New Schema)
CREATE TABLE payslips (
    id SERIAL PRIMARY KEY,
    payroll_run_id INTEGER REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Salary Information
    monthly_salary DECIMAL(10,2) NOT NULL,
    daily_rate DECIMAL(10,2) NOT NULL,
    payroll_days DECIMAL(4,2) NOT NULL,
    
    -- Earnings
    basic_pay DECIMAL(10,2) NOT NULL,
    holiday_pay DECIMAL(10,2) DEFAULT 0,
    regular_allowance DECIMAL(10,2) DEFAULT 0,
    special_allowance DECIMAL(10,2) DEFAULT 0,
    other_earnings DECIMAL(10,2) DEFAULT 0,
    gross_pay DECIMAL(10,2) NOT NULL,
    
    -- Deductions (15th cutoff only)
    phic DECIMAL(10,2) DEFAULT 0,
    pagibig DECIMAL(10,2) DEFAULT 0,
    pagibig_loan DECIMAL(10,2) DEFAULT 0,
    company_funds DECIMAL(10,2) DEFAULT 0,
    
    -- Deductions (30th cutoff only)
    sss DECIMAL(10,2) DEFAULT 0,
    sss_loan DECIMAL(10,2) DEFAULT 0,
    
    -- Deductions (both cutoffs)
    company_loan DECIMAL(10,2) DEFAULT 0,
    cash_advance DECIMAL(10,2) DEFAULT 0,
    other_deductions DECIMAL(10,2) DEFAULT 0,
    
    -- Totals
    total_deductions DECIMAL(10,2) NOT NULL,
    net_pay DECIMAL(10,2) NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3.3 Payroll Audit Log Table
CREATE TABLE payroll_audit_log (
    id SERIAL PRIMARY KEY,
    payroll_run_id INTEGER REFERENCES payroll_runs(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    performed_by INTEGER REFERENCES users(id),
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 4: Create indexes for performance
-- ============================================

-- Payroll Runs indexes
CREATE INDEX idx_payroll_runs_branch ON payroll_runs(branch);
CREATE INDEX idx_payroll_runs_status ON payroll_runs(status);
CREATE INDEX idx_payroll_runs_period ON payroll_runs(payroll_period_start, payroll_period_end);
CREATE INDEX idx_payroll_runs_created_by ON payroll_runs(created_by);

-- Payslips indexes
CREATE INDEX idx_payslips_payroll_run ON payslips(payroll_run_id);
CREATE INDEX idx_payslips_employee ON payslips(employee_id);
CREATE INDEX idx_payslips_created_at ON payslips(created_at);

-- Audit log indexes
CREATE INDEX idx_payroll_audit_run ON payroll_audit_log(payroll_run_id);
CREATE INDEX idx_payroll_audit_user ON payroll_audit_log(performed_by);
CREATE INDEX idx_payroll_audit_created ON payroll_audit_log(created_at);

-- ============================================
-- STEP 5: Create helper functions
-- ============================================

-- Function to generate payroll run number
CREATE OR REPLACE FUNCTION generate_payroll_run_number(
    p_branch VARCHAR,
    p_period_start DATE,
    p_cutoff INTEGER
)
RETURNS VARCHAR AS $$
DECLARE
    v_year VARCHAR(4);
    v_month VARCHAR(2);
    v_sequence INTEGER;
    v_run_number VARCHAR(50);
BEGIN
    v_year := TO_CHAR(p_period_start, 'YYYY');
    v_month := TO_CHAR(p_period_start, 'MM');
    
    -- Get next sequence number for this month
    SELECT COALESCE(MAX(CAST(SUBSTRING(run_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM payroll_runs
    WHERE run_number LIKE p_branch || '-' || v_year || v_month || '-%';
    
    -- Format: BRANCH-YYYYMM-CUTOFF-SEQ (e.g., ORMOC-202601-15-001)
    v_run_number := p_branch || '-' || v_year || v_month || '-' || p_cutoff || '-' || LPAD(v_sequence::TEXT, 3, '0');
    
    RETURN v_run_number;
END;
$$ LANGUAGE plpgsql;

-- Function to compute payslip
CREATE OR REPLACE FUNCTION compute_payslip(
    p_monthly_salary DECIMAL,
    p_payroll_days DECIMAL,
    p_regular_allowance DECIMAL DEFAULT 0,
    p_special_allowance DECIMAL DEFAULT 0,
    p_holiday_pay DECIMAL DEFAULT 0,
    p_other_earnings DECIMAL DEFAULT 0
)
RETURNS TABLE (
    daily_rate DECIMAL,
    basic_pay DECIMAL,
    gross_pay DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROUND(p_monthly_salary / 30, 2) AS daily_rate,
        ROUND((p_monthly_salary / 30) * p_payroll_days, 2) AS basic_pay,
        ROUND(
            (p_monthly_salary / 30) * p_payroll_days +
            COALESCE(p_regular_allowance, 0) +
            COALESCE(p_special_allowance, 0) +
            COALESCE(p_holiday_pay, 0) +
            COALESCE(p_other_earnings, 0),
            2
        ) AS gross_pay;
END;
$$ LANGUAGE plpgsql;

-- Function to log payroll actions
CREATE OR REPLACE FUNCTION log_payroll_action()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO payroll_audit_log (payroll_run_id, action, performed_by, details)
        VALUES (NEW.id, 'CREATED', NEW.created_by, row_to_json(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            INSERT INTO payroll_audit_log (payroll_run_id, action, performed_by, details)
            VALUES (
                NEW.id,
                'STATUS_CHANGED',
                NEW.approved_by,
                jsonb_build_object(
                    'old_status', OLD.status,
                    'new_status', NEW.status,
                    'changed_at', CURRENT_TIMESTAMP
                )
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payroll audit logging
CREATE TRIGGER payroll_audit_trigger
AFTER INSERT OR UPDATE ON payroll_runs
FOR EACH ROW
EXECUTE FUNCTION log_payroll_action();

-- ============================================
-- STEP 6: Create views for reporting
-- ============================================

-- View: Payroll Summary by Branch
CREATE OR REPLACE VIEW payroll_summary_by_branch AS
SELECT
    pr.branch,
    pr.payroll_period_start,
    pr.payroll_period_end,
    pr.cutoff_day,
    pr.status,
    COUNT(ps.id) AS employee_count,
    SUM(ps.gross_pay) AS total_gross_pay,
    SUM(ps.total_deductions) AS total_deductions,
    SUM(ps.net_pay) AS total_net_pay
FROM payroll_runs pr
LEFT JOIN payslips ps ON pr.id = ps.payroll_run_id
GROUP BY pr.id, pr.branch, pr.payroll_period_start, pr.payroll_period_end, pr.cutoff_day, pr.status;

-- View: Employee Payroll History
CREATE OR REPLACE VIEW employee_payroll_history AS
SELECT
    e.id AS employee_id,
    e.employee_id AS employee_number,
    e.first_name,
    e.last_name,
    e.department,
    e.branch,
    pr.run_number,
    pr.payroll_period_start,
    pr.payroll_period_end,
    pr.cutoff_day,
    ps.payroll_days,
    ps.gross_pay,
    ps.total_deductions,
    ps.net_pay,
    pr.status,
    ps.created_at
FROM employees e
JOIN payslips ps ON e.id = ps.employee_id
JOIN payroll_runs pr ON ps.payroll_run_id = pr.id
ORDER BY ps.created_at DESC;

-- ============================================
-- STEP 7: Insert sample data (optional - for testing)
-- ============================================

-- Uncomment to insert sample payroll run
/*
INSERT INTO payroll_runs (
    run_number,
    branch,
    payroll_period_start,
    payroll_period_end,
    cutoff_day,
    default_payroll_days,
    status,
    created_by
) VALUES (
    'ORMOC-202602-15-001',
    'Ormoc',
    '2026-02-01',
    '2026-02-15',
    15,
    15.00,
    'draft',
    1
);
*/

-- ============================================
-- STEP 8: Grant permissions (adjust as needed)
-- ============================================

-- Grant permissions to application role
-- GRANT SELECT, INSERT, UPDATE ON payroll_runs TO app_role;
-- GRANT SELECT, INSERT, UPDATE ON payslips TO app_role;
-- GRANT SELECT, INSERT ON payroll_audit_log TO app_role;

-- ============================================
-- Migration Complete
-- ============================================

-- Verify tables were created
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('payroll_runs', 'payslips', 'payroll_audit_log')
ORDER BY table_name;

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '✅ Payroll module migration completed successfully!';
    RAISE NOTICE '📊 New tables created: payroll_runs, payslips, payroll_audit_log';
    RAISE NOTICE '🔧 Helper functions created: generate_payroll_run_number, compute_payslip';
    RAISE NOTICE '📈 Views created: payroll_summary_by_branch, employee_payroll_history';
    RAISE NOTICE '🔒 Audit trigger enabled for payroll_runs';
END $$;
