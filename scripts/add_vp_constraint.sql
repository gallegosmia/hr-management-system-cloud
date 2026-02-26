-- Enforce VP Approval for Released Payroll
-- Adds a database check constraint to ensure that a payroll cannot be marked 'Released'
-- unless the Vice President approval step ('evp_review_status') is 'Approved'.

ALTER TABLE payroll_runs
ADD CONSTRAINT chk_release_requires_vp
CHECK (
    status != 'Released'
    OR evp_review_status = 'Approved'
);
