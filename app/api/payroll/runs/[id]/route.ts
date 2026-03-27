/**
 * Payroll Run Details API Route
 * GET /api/payroll/runs/[id] - Get payroll run with payslips
 * PATCH /api/payroll/runs/[id] - Update payroll run
 * DELETE /api/payroll/runs/[id] - Delete payroll run
 *
 * APPROVAL WORKFLOW:
 *   Stage 1: Draft             (HR creates)
 *   Stage 2: Branch Manager    (HR finalizes -> BM reviews)
 *   Stage 3: Operations Mgr    (BM approves  -> Ops reviews)
 *   Stage 4: Exec Vice Pres    (Ops approves -> EVP reviews)
 *   Stage 5: For Release       (EVP approves)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireBranchAuth } from '@/lib/middleware/branch-auth';
import { canAccessPayroll, validatePayrollAccess } from '@/lib/payroll-access';
import { sendEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payroll/runs/[id]
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    console.log(`[GET] /api/payroll/runs/${params.id} - Request started`);
    try {
        if (!params.id) {
            return NextResponse.json({ error: 'Missing ID parameter' }, { status: 400 });
        }

        const payrollRunId = Number(params.id);
        if (!Number.isInteger(payrollRunId) || isNaN(payrollRunId)) {
            return NextResponse.json({ error: 'Invalid payroll run ID' }, { status: 400 });
        }

        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;
        const [user, selectedBranch] = auth;
        console.log(`[GET] User: ${user.username}, Role: ${user.role}, Branch: ${selectedBranch}`);

        const runById = await query(`SELECT * FROM payroll_runs WHERE id = $1`, [payrollRunId]);
        if (runById.rows.length === 0) {
            return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
        }

        let payrollRun: any = runById.rows[0];

        // Enrich creator/approver names
        if (payrollRun.created_by) {
            const u = await query(`SELECT username FROM users WHERE id = $1`, [payrollRun.created_by]);
            if (u.rows.length > 0) payrollRun.created_by_name = u.rows[0].username;
        }
        if (payrollRun.approved_by) {
            const a = await query(`SELECT username FROM users WHERE id = $1`, [payrollRun.approved_by]);
            if (a.rows.length > 0) payrollRun.approved_by_name = a.rows[0].username;
        }

        // Backfill workflow_stage for legacy records
        if (payrollRun.workflow_stage == null || payrollRun.workflow_stage === 0) {
            const s = (payrollRun.status || '').toLowerCase();
            if (s.includes('branch manager')) payrollRun.workflow_stage = 2;
            else if (s.includes('operations')) payrollRun.workflow_stage = 3;
            else if (s.includes('executive vice president') || s.includes('vice president')) payrollRun.workflow_stage = 4;
            else if (['for release', 'approved', 'released', 'locked'].includes(s)) payrollRun.workflow_stage = 5;
            else if (s === 'draft') payrollRun.workflow_stage = 1;
        }

        // Check branch access
        if (!canAccessPayroll(user, payrollRun.branch)) {
            console.warn(`[GET] Access denied for user ${user.username} to branch ${payrollRun.branch}`);
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // AUTO-CORRECTION: if Released but lacking EVP approval, revert
        if (payrollRun.status === 'Released' && (payrollRun.workflow_stage < 5 || payrollRun.evp_review_status !== 'Approved')) {
            console.warn(`[GET] Security Alert: Payroll ${payrollRun.run_number} is 'Released' but lacks EVP Approval. Reverting...`);
            await query(`
                UPDATE payroll_runs
                SET status = 'Under Review - Executive Vice President', workflow_stage = 4
                WHERE id = $1
            `, [payrollRunId]);
            await query(`
                INSERT INTO payroll_audit_log (payroll_run_id, action, performed_by, details, performed_at)
                VALUES ($1, $2, $3, $4, $5)
            `, [payrollRunId, 'SYSTEM_REVERT', user.id || 0,
                JSON.stringify({ reason: 'Reverted due to missing EVP approval' }), new Date().toISOString()]);
            payrollRun.status = 'Under Review - Executive Vice President';
            payrollRun.workflow_stage = 4;
        }

        // Fetch payslips
        const payslipsResult = await query(`SELECT * FROM payslips WHERE payroll_run_id = $1`, [payrollRunId]);

        const processedPayslips = await Promise.all(payslipsResult.rows.map(async (payslip: any) => {
            const empRes = await query(`
                SELECT employee_id, first_name, last_name, department, position, branch, salary_info, id
                FROM employees WHERE id = $1
            `, [payslip.employee_id]);
            const emp = empRes.rows[0] || {};

            let company_loan_balance = 0;
            const loanRes = await query(`
                SELECT balance, status FROM employee_loans WHERE employee_id = $1
            `, [payslip.employee_id]);
            if (loanRes && loanRes.rows) {
                const activeStatuses = ['active', 'ongoing', 'approved'];
                company_loan_balance = loanRes.rows.reduce((sum: number, l: any) => {
                    const st = (l.status || '').toLowerCase();
                    const bal = parseFloat(l.balance);
                    return (activeStatuses.includes(st) && !isNaN(bal) && bal > 0) ? sum + bal : sum;
                }, 0);
            }

            return {
                ...payslip,
                employee_number: emp.employee_id,
                first_name: emp.first_name,
                last_name: emp.last_name,
                department: emp.department,
                position: emp.position,
                branch: emp.branch,
                salary_info: emp.salary_info,
                company_loan_balance,
            };
        }));

        processedPayslips.sort((a: any, b: any) => {
            const nameA = ((a.last_name || '') + ' ' + (a.first_name || '')).toLowerCase().trim();
            const nameB = ((b.last_name || '') + ' ' + (b.first_name || '')).toLowerCase().trim();
            return nameA.localeCompare(nameB);
        });

        const finalPayslips = processedPayslips.map((payslip: any) => {
            if (!payslip.company_loan_balance || parseFloat(payslip.company_loan_balance) <= 0) {
                try {
                    const sInfo = typeof payslip.salary_info === 'string'
                        ? JSON.parse(payslip.salary_info) : payslip.salary_info;
                    if (sInfo?.deductions?.company_loan_balance) {
                        const v = parseFloat(sInfo.deductions.company_loan_balance);
                        if (!isNaN(v) && v > 0) payslip.company_loan_balance = v;
                    }
                } catch (e) { }
            }
            try {
                const sInfo = typeof payslip.salary_info === 'string'
                    ? JSON.parse(payslip.salary_info) : payslip.salary_info;
                if (sInfo?.deductions?.company_funds_balance) {
                    payslip.company_funds_balance = parseFloat(sInfo.deductions.company_funds_balance) || 0;
                }
            } catch (e) { }
            return payslip;
        });

        console.log(`[GET] Success. Returning ${finalPayslips.length} payslips.`);
        return NextResponse.json({ payrollRun, payslips: finalPayslips });

    } catch (error: any) {
        console.error('Error fetching payroll run:', error);
        return NextResponse.json({ error: 'Failed to fetch payroll run', details: error.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: update/revert company loan balances
// ─────────────────────────────────────────────────────────────────────────────
async function updateCompanyLoanBalances(payrollRunId: string, isDeduction: boolean) {
    try {
        const payslips = await query(`
            SELECT employee_id, company_loan FROM payslips
            WHERE payroll_run_id = $1 AND company_loan > 0
        `, [payrollRunId]);

        for (const p of payslips.rows) {
            const amount = parseFloat(p.company_loan);
            if (amount <= 0) continue;

            const loans = await query(`
                SELECT id, balance, status FROM employee_loans
                WHERE employee_id = $1 AND status IN ('Active', 'Ongoing', 'Approved', 'Paid')
                ORDER BY id ASC
            `, [p.employee_id]);

            let remaining = amount;

            if (isDeduction) {
                const activeLoans = loans.rows.filter((l: any) => l.status !== 'Paid' && parseFloat(l.balance) > 0);
                for (const loan of activeLoans) {
                    if (remaining <= 0) break;
                    const currentBalance = parseFloat(loan.balance);
                    if (isNaN(currentBalance)) continue;
                    const deduction = Math.min(remaining, currentBalance);
                    const newBalance = currentBalance - deduction;
                    const newStatus = newBalance <= 0 ? 'Paid' : loan.status;
                    await query(`UPDATE employee_loans SET balance = $1, status = $2 WHERE id = $3`, [newBalance, newStatus, loan.id]);
                    remaining -= deduction;
                }
            } else {
                const targetLoans = loans.rows.sort((a: any, b: any) => b.id - a.id);
                if (targetLoans.length > 0) {
                    const loan = targetLoans[0];
                    const currentBalance = parseFloat(loan.balance);
                    if (!isNaN(currentBalance)) {
                        const newBalance = currentBalance + remaining;
                        const newStatus = loan.status === 'Paid' && newBalance > 0 ? 'Active' : loan.status;
                        await query(`UPDATE employee_loans SET balance = $1, status = $2 WHERE id = $3`, [newBalance, newStatus, loan.id]);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error updating loan balances:', error);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/payroll/runs/[id]
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        if (!params.id) {
            return NextResponse.json({ error: 'Missing ID parameter' }, { status: 400 });
        }

        const payrollRunId = Number(params.id);
        if (!Number.isInteger(payrollRunId) || isNaN(payrollRunId)) {
            return NextResponse.json({ error: 'Invalid payroll run ID' }, { status: 400 });
        }

        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;
        const [user, selectedBranch] = auth;

        const body = await request.json();
        const { action } = body;

        const runResult = await query(`SELECT * FROM payroll_runs WHERE id = $1`, [payrollRunId]);
        if (runResult.rows.length === 0) {
            return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
        }
        const payrollRun = runResult.rows[0];

        // Backfill workflow_stage for legacy records
        if (payrollRun.workflow_stage == null || payrollRun.workflow_stage === 0) {
            const s = (payrollRun.status || '').toLowerCase();
            if (s.includes('branch manager')) payrollRun.workflow_stage = 2;
            else if (s.includes('operations')) payrollRun.workflow_stage = 3;
            else if (s.includes('executive vice president') || s.includes('vice president')) payrollRun.workflow_stage = 4;
            else if (['for release', 'approved', 'released', 'locked'].includes(s)) payrollRun.workflow_stage = 5;
            else if (s === 'draft') payrollRun.workflow_stage = 1;
        }

        if (!canAccessPayroll(user, payrollRun.branch)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // ──────────────────────────────────────────────────────────────
        // ACTION: finalize  (HR -> Stage 2: Branch Manager Review)
        // ──────────────────────────────────────────────────────────────
        if (action === 'finalize') {
            console.log('[PATCH] Action: finalize');
            if (!['HR', 'Super Admin', 'Admin'].includes(user.role)) {
                return NextResponse.json({ error: 'Only HR Officer or Super Admin can finalize payroll' }, { status: 403 });
            }

            const currentStatus = (payrollRun.status || '').toUpperCase();
            if (payrollRun.workflow_stage >= 2 || currentStatus.includes('UNDER REVIEW')) {
                return NextResponse.json({ success: true, message: 'Payroll is already finalized and under review.' });
            }
            if (currentStatus !== 'DRAFT' && !currentStatus.includes('RETURNED')) {
                return NextResponse.json({ error: `Payroll is not in Draft state. Current status: ${payrollRun.status}` }, { status: 400 });
            }

            try {
                const totalsResult = await query(`
                    SELECT
                        COUNT(*) as employee_count,
                        COALESCE(SUM(net_pay), 0) as total_net_pay,
                        COALESCE(SUM(gross_pay), 0) as total_gross_pay
                    FROM payslips WHERE payroll_run_id = $1
                `, [payrollRunId]);
                const totals = totalsResult.rows[0];

                await query(`
                    UPDATE payroll_runs
                    SET status = 'Under Review - Branch Manager',
                        workflow_stage = 2,
                        current_reviewer_role = 'Manager',
                        process_date = NOW(),
                        employee_count = $2,
                        total_net_pay = $3,
                        total_gross_pay = $4,
                        updated_at = NOW()
                    WHERE id = $1
                `, [payrollRunId, totals.employee_count, totals.total_net_pay, totals.total_gross_pay]);

                const managers = await query("SELECT id FROM users WHERE role IN ('Manager', 'Super Admin')");
                for (const m of managers.rows) {
                    let fp = '';
                    try {
                        const d1 = new Date(payrollRun.payroll_period_start);
                        const d2 = new Date(payrollRun.payroll_period_end);
                        fp = `${d1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${d2.getDate()}, ${d2.getFullYear()}`;
                    } catch (e) { fp = `${payrollRun.payroll_period_start} to ${payrollRun.payroll_period_end}`; }
                    await createNotification({
                        userId: m.id,
                        type: 'PAYROLL_SUBMITTED',
                        title: 'Payroll Awaiting Branch Manager Approval',
                        message: `Payroll for ${fp} requires your approval.`,
                        link: `/payroll/${payrollRunId}`,
                        referenceId: payrollRunId.toString(),
                        severity: 'high'
                    });
                }

                await query(`
                    INSERT INTO payroll_audit_log (payroll_run_id, action, performed_by, details, performed_at)
                    VALUES ($1, $2, $3, $4, $5)
                `, [payrollRunId, 'FINALIZED_BY_HR', user.id,
                    JSON.stringify({ run_number: payrollRun.run_number, stage: 'DRAFT -> BRANCH MANAGER REVIEW' }),
                    new Date().toISOString()]);

                await updateCompanyLoanBalances(payrollRunId.toString(), true);

                return NextResponse.json({ success: true, message: 'Payroll finalized and submitted for Branch Manager Review.' });
            } catch (innerError: any) {
                console.error('[PATCH] Finalize Logic Error:', innerError);
                return NextResponse.json({ error: 'Finalize failed', details: innerError.message }, { status: 500 });
            }
        }

        // ──────────────────────────────────────────────────────────────
        // ACTION: approve   (3-step chain)
        //   Stage 2 (Branch Manager)    -> Stage 3 (Operations Manager)
        //   Stage 3 (Operations Manager) -> Stage 4 (Executive VP)
        // ──────────────────────────────────────────────────────────────
        if (action === 'approve') {
            const isManager = user.role === 'Manager';
            const isOps    = user.role === 'Operations Manager';
            const isSuper  = user.role === 'Super Admin';

            // Stage 2: Branch Manager
            if (payrollRun.workflow_stage === 2 || payrollRun.status === 'Under Review - Branch Manager') {
                if (!isManager && !isSuper) {
                    return NextResponse.json({ error: 'Only the Branch Manager can approve at this stage' }, { status: 403 });
                }

                await query(`
                    UPDATE payroll_runs
                    SET status = 'Under Review - Operations Manager',
                        workflow_stage = 3,
                        current_reviewer_role = 'Operations Manager',
                        updated_at = NOW()
                    WHERE id = $1
                `, [payrollRunId]);

                const opsUsers = await query("SELECT id FROM users WHERE role IN ('Operations Manager', 'Super Admin')");
                for (const op of opsUsers.rows) {
                    let fp = '';
                    try {
                        const d1 = new Date(payrollRun.payroll_period_start);
                        const d2 = new Date(payrollRun.payroll_period_end);
                        fp = `${d1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${d2.getDate()}, ${d2.getFullYear()}`;
                    } catch (e) { fp = `${payrollRun.payroll_period_start} to ${payrollRun.payroll_period_end}`; }
                    await createNotification({
                        userId: op.id,
                        type: 'PAYROLL_PENDING_OPS',
                        title: 'Payroll Awaiting Operations Manager Approval',
                        message: `Payroll for ${fp} requires your approval.`,
                        link: `/payroll/${payrollRunId}`,
                        referenceId: payrollRunId.toString(),
                        severity: 'high'
                    });
                }

                await query(`
                    INSERT INTO payroll_audit_log (payroll_run_id, action, performed_by, details, performed_at)
                    VALUES ($1, $2, $3, $4, $5)
                `, [payrollRunId, 'APPROVED_BY_BRANCH_MANAGER', user.id,
                    JSON.stringify({ run_number: payrollRun.run_number }), new Date().toISOString()]);

                return NextResponse.json({ success: true, message: 'Approved by Branch Manager. Forwarded to Operations Manager.' });
            }

            // Stage 3: Operations Manager
            if (payrollRun.workflow_stage === 3 || payrollRun.status === 'Under Review - Operations Manager') {
                if (!isOps && !isSuper) {
                    return NextResponse.json({ error: 'Only the Operations Manager can approve at this stage' }, { status: 403 });
                }

                await query(`
                    UPDATE payroll_runs
                    SET status = 'Under Review - Executive Vice President',
                        workflow_stage = 4,
                        current_reviewer_role = 'Vice President',
                        updated_at = NOW()
                    WHERE id = $1
                `, [payrollRunId]);

                const evpUsers = await query("SELECT id FROM users WHERE role IN ('Vice President', 'Executive Vice President', 'Super Admin')");
                for (const vp of evpUsers.rows) {
                    let fp = '';
                    try {
                        const d1 = new Date(payrollRun.payroll_period_start);
                        const d2 = new Date(payrollRun.payroll_period_end);
                        fp = `${d1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${d2.getDate()}, ${d2.getFullYear()}`;
                    } catch (e) { fp = `${payrollRun.payroll_period_start} to ${payrollRun.payroll_period_end}`; }
                    await createNotification({
                        userId: vp.id,
                        type: 'PAYROLL_PENDING_EVP',
                        title: 'Payroll Awaiting EVP Final Approval',
                        message: `Payroll for ${fp} requires your final approval.`,
                        link: `/payroll/${payrollRunId}`,
                        referenceId: payrollRunId.toString(),
                        severity: 'high'
                    });
                }

                await query(`
                    INSERT INTO payroll_audit_log (payroll_run_id, action, performed_by, details, performed_at)
                    VALUES ($1, $2, $3, $4, $5)
                `, [payrollRunId, 'APPROVED_BY_OPS', user.id,
                    JSON.stringify({ run_number: payrollRun.run_number }), new Date().toISOString()]);

                return NextResponse.json({ success: true, message: 'Approved by Operations Manager. Forwarded to Executive Vice President.' });
            }

            return NextResponse.json({ error: 'Payroll is not in a state ready for this approval action' }, { status: 400 });
        }

        // ──────────────────────────────────────────────────────────────
        // ACTION: final_approve  (EVP -> Stage 5: For Release)
        // ──────────────────────────────────────────────────────────────
        if (action === 'final_approve') {
            if (!['Vice President', 'Executive Vice President', 'Super Admin'].includes(user.role)) {
                return NextResponse.json({ error: 'Only the Executive Vice President can perform final approval' }, { status: 403 });
            }
            if (payrollRun.status === 'For Release' || payrollRun.workflow_stage === 5) {
                return NextResponse.json({ success: true, message: 'Payroll is already fully approved.' });
            }
            if (payrollRun.workflow_stage !== 4 && payrollRun.status !== 'Under Review - Executive Vice President') {
                return NextResponse.json({
                    error: `Payroll is not ready for EVP approval. Status: ${payrollRun.status}. (Must be approved by Operations Manager first)`
                }, { status: 400 });
            }

            await query(`
                UPDATE payroll_runs
                SET status = 'For Release',
                    workflow_stage = 5,
                    current_reviewer_role = null,
                    evp_review_status = 'Approved',
                    evp_review_date = NOW(),
                    approved_by = $1,
                    approved_at = NOW(),
                    updated_at = NOW()
                WHERE id = $2
            `, [user.id, payrollRunId]);

            await query(`
                INSERT INTO payroll_audit_log(payroll_run_id, action, performed_by, details, performed_at)
                VALUES($1, $2, $3, $4, $5)
            `, [payrollRunId, 'APPROVED_BY_EVP', user.id,
                JSON.stringify({ run_number: payrollRun.run_number }), new Date().toISOString()]);

            return NextResponse.json({ success: true, message: 'Payroll fully approved by EVP. Status set to For Release.' });
        }

        // ──────────────────────────────────────────────────────────────
        // ACTION: release   (For Release -> Released)
        // ──────────────────────────────────────────────────────────────
        if (action === 'release') {
            if (!['Finance', 'Super Admin', 'HR', 'Admin'].includes(user.role)) {
                return NextResponse.json({ error: 'Unauthorized to mark as released' }, { status: 403 });
            }
            if (payrollRun.evp_review_status !== 'Approved') {
                return NextResponse.json({
                    error: 'Payroll cannot be released. Executive Vice President approval is pending.',
                    code: 'MISSING_EVP_APPROVAL'
                }, { status: 400 });
            }
            if (payrollRun.status !== 'For Release' && payrollRun.status !== 'Approved' && payrollRun.workflow_stage < 5) {
                return NextResponse.json({ error: `Payroll is not ready for release. Status: ${payrollRun.status}` }, { status: 400 });
            }

            await query(`
                UPDATE payroll_runs SET status = 'Released', updated_at = NOW() WHERE id = $1
            `, [payrollRunId]);

            await query(`
                INSERT INTO payroll_audit_log(payroll_run_id, action, performed_by, details, performed_at)
                VALUES($1, $2, $3, $4, $5)
            `, [payrollRunId, 'MARKED_RELEASED', user.id,
                JSON.stringify({ run_number: payrollRun.run_number }), new Date().toISOString()]);

            const releaseUsers = await query("SELECT id FROM users WHERE role IN ('HR', 'Operations Manager', 'Vice President', 'Executive Vice President', 'Super Admin')");
            for (const ru of releaseUsers.rows) {
                let fp = '';
                try {
                    const d1 = new Date(payrollRun.payroll_period_start);
                    const d2 = new Date(payrollRun.payroll_period_end);
                    fp = `${d1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${d2.getDate()}, ${d2.getFullYear()}`;
                } catch (e) { fp = `${payrollRun.payroll_period_start} to ${payrollRun.payroll_period_end}`; }
                await createNotification({
                    userId: ru.id,
                    type: 'PAYROLL_RELEASED',
                    title: 'Payroll Released',
                    message: `Payroll for ${fp} has been successfully released.`,
                    link: `/payroll/${payrollRunId}`,
                    referenceId: payrollRunId.toString(),
                    severity: 'medium'
                });
            }

            return NextResponse.json({ success: true, message: 'Payroll marked as Released.' });
        }

        // ──────────────────────────────────────────────────────────────
        // ACTION: return
        // ──────────────────────────────────────────────────────────────
        if (action === 'return') {
            const { remarks } = body;
            if (!remarks) {
                return NextResponse.json({ error: 'Remarks are required for return action' }, { status: 400 });
            }

            let newStatus = '';
            let auditAction = '';
            let targetRole = '';

            if (payrollRun.status === 'Under Review - Branch Manager') {
                if (user.role !== 'Manager' && user.role !== 'Super Admin') return NextResponse.json({ error: 'Unauthorized return' }, { status: 403 });
                newStatus = 'Returned to HR';
                auditAction = 'RETURNED_TO_HR';
                targetRole = 'HR';
            } else if (payrollRun.status === 'Under Review - Operations Manager') {
                if (user.role !== 'Operations Manager' && user.role !== 'Super Admin') return NextResponse.json({ error: 'Unauthorized return' }, { status: 403 });
                newStatus = 'Returned to Branch Manager';
                auditAction = 'RETURNED_TO_BRANCH_MANAGER';
                targetRole = 'Branch Manager';
            } else if (payrollRun.status === 'Under Review - Executive Vice President') {
                if (!['Vice President', 'Executive Vice President', 'Super Admin'].includes(user.role)) return NextResponse.json({ error: 'Unauthorized return' }, { status: 403 });
                newStatus = 'Returned to Operations Manager';
                auditAction = 'RETURNED_TO_OPS';
                targetRole = 'Operations Manager';
            } else {
                return NextResponse.json({ error: 'Cannot return from current status' }, { status: 400 });
            }

            await query(`
                UPDATE payroll_runs SET status = $1, return_remarks = $2, updated_at = NOW() WHERE id = $3
            `, [newStatus, remarks, payrollRunId]);

            try {
                await query(`
                    INSERT INTO payroll_audit_log(payroll_run_id, action, performed_by, details, performed_at)
                    VALUES($1, $2, $3, $4, $5)
                `, [payrollRunId, auditAction, user.id,
                    JSON.stringify({ run_number: payrollRun.run_number, remarks }), new Date().toISOString()]);
            } catch (e) { }

            if (newStatus === 'Returned to HR') {
                await updateCompanyLoanBalances(payrollRunId.toString(), false);
            }

            // Notify the user role that the payroll was returned to
            let previousStageUsers: any;
            if (targetRole === 'HR') {
                previousStageUsers = await query(`SELECT id FROM users WHERE role IN ('HR', 'Admin') AND (branch = $1 OR assigned_branch = $1 OR username = 'superadmin')`, [payrollRun.branch]);
            } else if (targetRole === 'Branch Manager') {
                previousStageUsers = await query(`SELECT id FROM users WHERE role IN ('Manager', 'Admin') AND (branch = $1 OR assigned_branch = $1 OR username = 'superadmin')`, [payrollRun.branch]);
            } else if (targetRole === 'Operations Manager') {
                previousStageUsers = await query("SELECT id FROM users WHERE role IN ('Operations Manager', 'Super Admin')");
            }

            if (previousStageUsers && previousStageUsers.rows.length > 0) {
                let fp = '';
                try {
                    const d1 = new Date(payrollRun.payroll_period_start);
                    const d2 = new Date(payrollRun.payroll_period_end);
                    fp = `${d1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${d2.getDate()}, ${d2.getFullYear()}`;
                } catch (e) { fp = `${payrollRun.payroll_period_start} to ${payrollRun.payroll_period_end}`; }
                
                for (const u of previousStageUsers.rows) {
                    await createNotification({
                        userId: u.id,
                        type: 'PAYROLL_RETURNED',
                        title: `Payroll Returned by ${user.role}`,
                        message: `Payroll for ${fp} was returned for revisions. Remarks: ${remarks}`,
                        link: `/payroll/${payrollRunId}`,
                        referenceId: payrollRunId.toString(),
                        severity: 'high'
                    });
                }
            }

            return NextResponse.json({ success: true, message: `Payroll returned to ${targetRole}.` });
        }

        // ──────────────────────────────────────────────────────────────
        // ACTION: lock
        // ──────────────────────────────────────────────────────────────
        if (action === 'lock') {
            const accessCheck = validatePayrollAccess(user, 'lock', payrollRun.branch);
            if (!accessCheck.allowed) {
                return NextResponse.json({ error: accessCheck.error }, { status: 403 });
            }
            if (payrollRun.status !== 'Released' && payrollRun.status !== 'Approved') {
                if (payrollRun.workflow_stage < 5) {
                    return NextResponse.json({ error: 'Payroll must be Released before locking.' }, { status: 400 });
                }
            }

            await query(`UPDATE payroll_runs SET status = 'locked', updated_at = NOW() WHERE id = $1`, [payrollRunId]);

            await query(`
                INSERT INTO payroll_audit_log(payroll_run_id, action, performed_by, details, performed_at)
                VALUES($1, $2, $3, $4, $5)
            `, [payrollRunId, 'LOCKED', user.id,
                JSON.stringify({ run_number: payrollRun.run_number }), new Date().toISOString()]);

            return NextResponse.json({ success: true, message: 'Payroll locked successfully' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Error updating payroll run:', error);
        return NextResponse.json({ error: 'Failed to update payroll run', details: error.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/payroll/runs/[id]
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;
        const [user, selectedBranch] = auth;

        const payrollRunId = Number(params.id);
        if (!Number.isInteger(payrollRunId) || isNaN(payrollRunId)) {
            return NextResponse.json({ error: 'Invalid payroll run ID' }, { status: 400 });
        }

        const runResult = await query(`SELECT * FROM payroll_runs WHERE id = $1`, [payrollRunId]);
        if (runResult.rows.length === 0) {
            return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
        }
        const payrollRun = runResult.rows[0];

        const accessCheck = validatePayrollAccess(user, 'delete', payrollRun.branch);
        if (!accessCheck.allowed) {
            return NextResponse.json({ error: accessCheck.error }, { status: 403 });
        }

        if (!['Super Admin', 'Admin', 'President', 'Vice President', 'Operations Manager'].includes(user.role)) {
            if (!canAccessPayroll(user, payrollRun.branch)) {
                return NextResponse.json({ error: 'Access denied to this branch' }, { status: 403 });
            }
        }

        if (payrollRun.status === 'locked') {
            return NextResponse.json({ error: 'Cannot delete locked payroll' }, { status: 400 });
        }

        const isAuthorized = ['Super Admin', 'Admin', 'President', 'Vice President', 'HR', 'Finance', 'Operations Manager'].includes(user.role);
        if (!isAuthorized && (!payrollRun.status || payrollRun.status.toLowerCase() !== 'draft')) {
            return NextResponse.json({ error: 'Only Draft payroll can be deleted by this user role.' }, { status: 400 });
        }

        const wasProcessed = payrollRun.status &&
            payrollRun.status.toLowerCase() !== 'draft' &&
            !payrollRun.status.toLowerCase().includes('returned');

        if (wasProcessed) {
            console.log(`[DELETE] Reverting loan balances for processed payroll run ${payrollRunId}`);
            try {
                await updateCompanyLoanBalances(payrollRunId.toString(), false);
            } catch (loanError: any) {
                throw new Error(`Failed to revert loan balances: ${loanError.message}`);
            }
        }

        try {
            await query(`
                INSERT INTO audit_logs(user_id, action, details, created_at)
                VALUES($1, $2, $3, CURRENT_TIMESTAMP)
            `, [user.id || 0, 'DELETE_PAYROLL', JSON.stringify({
                payroll_run_id: payrollRunId,
                run_number: payrollRun.run_number,
                previous_status: payrollRun.status,
                branch: payrollRun.branch,
                was_processed: wasProcessed,
            })]);
        } catch (auditError: any) {
            throw new Error(`Failed to record audit log: ${auditError.message}`);
        }

        await query(`DELETE FROM payroll_audit_log WHERE payroll_run_id = $1`, [payrollRunId]);
        await query(`DELETE FROM payslips WHERE payroll_run_id = $1`, [payrollRunId]);
        await query(`DELETE FROM payroll_runs WHERE id = $1`, [payrollRunId]);

        return NextResponse.json({ success: true, message: 'Payroll run deleted successfully' });

    } catch (error: any) {
        console.error('Error deleting payroll run:', error);
        return NextResponse.json({ error: 'Failed to delete payroll run', details: error.message, stack: error.stack }, { status: 500 });
    }
}
