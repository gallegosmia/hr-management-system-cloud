/**
 * Payroll Run Details API Route
 * GET /api/payroll/runs/[id] - Get payroll run with payslips
 * PATCH /api/payroll/runs/[id] - Update payroll run
 * DELETE /api/payroll/runs/[id] - Delete payroll run
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireBranchAuth } from '@/lib/middleware/branch-auth';
import { canAccessPayroll, validatePayrollAccess } from '@/lib/payroll-access';
import { sendEmail } from '@/lib/email';

// GET /api/payroll/runs/[id] - Get payroll run details with payslips
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    console.log(`[GET] /api/payroll/runs/${params.id} - Request started`);
    try {
        if (!params.id) {
            console.error('[GET] Missing ID parameter');
            return NextResponse.json({ error: 'Missing ID parameter' }, { status: 400 });
        }

        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) {
            console.warn('[GET] Auth failed:', auth.status);
            return auth;
        }
        const [user, selectedBranch] = auth;
        console.log(`[GET] User: ${user.username}, Role: ${user.role}, Branch: ${selectedBranch}`);

        const payrollRunId = params.id;

        // Get payroll run
        let payrollRun: any = null;
        console.log(`[GET] Querying payroll_runs for ID: ${payrollRunId}`);
        const runById = await query(`SELECT * FROM payroll_runs WHERE id = $1`, [payrollRunId]);

        if (runById.rows.length === 0) {
            console.warn(`[GET] Payroll run ${payrollRunId} not found`);
            return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
        }
        payrollRun = runById.rows[0];

        // Manual Join for Creator/Approver
        if (payrollRun.created_by) {
            const u = await query(`SELECT username FROM users WHERE id = $1`, [payrollRun.created_by]);
            if (u.rows.length > 0) payrollRun.created_by_name = u.rows[0].username;
        }
        if (payrollRun.approved_by) {
            const a = await query(`SELECT username FROM users WHERE id = $1`, [payrollRun.approved_by]);
            if (a.rows.length > 0) payrollRun.approved_by_name = a.rows[0].username;
        }


        // Backfill workflow_stage if missing (for legacy records)
        if (payrollRun.workflow_stage == null || payrollRun.workflow_stage === 0) {
            const s = (payrollRun.status || '').toLowerCase();
            if (s.includes('operations')) payrollRun.workflow_stage = 2;
            else if (s.includes('vice president')) payrollRun.workflow_stage = 4;
            else if (s.includes('president') && !s.includes('vice')) payrollRun.workflow_stage = 3;
            else if (['for release', 'approved', 'released', 'locked'].includes(s)) payrollRun.workflow_stage = 5;
            else if (s === 'draft') payrollRun.workflow_stage = 1;
        }

        // Check access
        if (!canAccessPayroll(user, payrollRun.branch)) {
            console.warn(`[GET] Access denied for user ${user.username} to branch ${payrollRun.branch}`);
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // AUTO-CORRECTION: Strict Workflow Enforcement
        // IF payroll_status = 'Released' AND VP approval is missing -> Revert
        if (payrollRun.status === 'Released' && (payrollRun.workflow_stage < 4 || payrollRun.evp_review_status !== 'Approved')) {
            console.warn(`[GET] Security Alert: Payroll ${payrollRun.run_number} is 'Released' but lacks VP Approval. Reverting...`);

            await query(`
                SET status = 'Under Review - Vice President', 
                    workflow_stage = 4
                WHERE id = $1
            `, [payrollRunId]);

            await query(`
                INSERT INTO payroll_audit_log (payroll_run_id, action, performed_by, details, performed_at)
                VALUES ($1, $2, $3, $4, $5)
            `, [payrollRunId, 'SYSTEM_REVERT', user.id || 0, JSON.stringify({ reason: 'Reverted due to missing VP approval' }), new Date().toISOString()]);

            // Update local object to reflect change
            payrollRun.status = 'Under Review - Vice President';
            payrollRun.workflow_stage = 4;
        }

        // Get payslips
        // Get payslips (Simple Query)
        console.log(`[GET] Fetching payslips for run ${payrollRunId}`);
        const payslipsResult = await query(`SELECT * FROM payslips WHERE payroll_run_id = $1`, [payrollRunId]);

        // Manual Join and Calculation
        const processedPayslips = await Promise.all(payslipsResult.rows.map(async (payslip: any) => {
            // Get Employee Details
            const empRes = await query(`SELECT employee_id, first_name, last_name, department, position, branch, salary_info, id FROM employees WHERE id = $1`, [payslip.employee_id]);
            const emp = empRes.rows[0] || {};

            // Calculate Company Loan Balance
            // Manual summation from employee_loans table
            let company_loan_balance = 0;
            const loanRes = await query(`
                SELECT balance, status FROM employee_loans 
                WHERE employee_id = $1 
             `, [payslip.employee_id]);

            if (loanRes && loanRes.rows) {
                const activestatuses = ['active', 'ongoing', 'approved'];
                company_loan_balance = loanRes.rows.reduce((sum: number, l: any) => {
                    const status = (l.status || '').toLowerCase();
                    const bal = parseFloat(l.balance);
                    if (activestatuses.includes(status) && !isNaN(bal) && bal > 0) {
                        return sum + bal;
                    }
                    return sum;
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
                company_loan_balance
            };
        }));

        // Sort manually
        processedPayslips.sort((a: any, b: any) => {
            const nameA = (a.last_name + a.first_name).toLowerCase();
            const nameB = (b.last_name + b.first_name).toLowerCase();
            return nameA.localeCompare(nameB);
        });

        // Process payslips to ensure company_loan_balance fallback from salary_info
        // Post-process for salary_info fallbacks
        const finalPayslips = processedPayslips.map((payslip: any) => {
            // If subquery returned 0 or null, try salary_info
            if (!payslip.company_loan_balance || parseFloat(payslip.company_loan_balance) <= 0) {
                try {
                    const sInfo = typeof payslip.salary_info === 'string'
                        ? JSON.parse(payslip.salary_info)
                        : payslip.salary_info;

                    if (sInfo?.deductions?.company_loan_balance) {
                        const sInfoBalance = parseFloat(sInfo.deductions.company_loan_balance);
                        if (!isNaN(sInfoBalance) && sInfoBalance > 0) {
                            payslip.company_loan_balance = sInfoBalance;
                        }
                    }
                } catch (e) {
                    // ignore parse error
                }
            }
            // Add company_funds_balance if available (future proofing)
            try {
                const sInfo = typeof payslip.salary_info === 'string'
                    ? JSON.parse(payslip.salary_info)
                    : payslip.salary_info;
                // If we want to show company funds balance, checking if it exists in salary_info
                // Currently it's not captured in CompensationTab but let's be safe
                if (sInfo?.deductions?.company_funds_balance) {
                    payslip.company_funds_balance = parseFloat(sInfo.deductions.company_funds_balance) || 0;
                }
            } catch (e) { }

            return payslip;
        });

        console.log(`[GET] Success. Returning ${finalPayslips.length} payslips.`);
        return NextResponse.json({
            payrollRun,
            payslips: finalPayslips
        });

    } catch (error: any) {
        console.error('Error fetching payroll run:', error);
        return NextResponse.json(
            { error: 'Failed to fetch payroll run', details: error.message },
            { status: 500 }
        );
    }
}

// Helper to update loan balances
async function updateCompanyLoanBalances(payrollRunId: string, isDeduction: boolean) {
    try {
        // Get all payslips with company_loan > 0
        const payslips = await query(`
            SELECT employee_id, company_loan 
            FROM payslips 
            WHERE payroll_run_id = $1 AND company_loan > 0
        `, [payrollRunId]);

        for (const p of payslips.rows) {
            const amount = parseFloat(p.company_loan);
            if (amount <= 0) continue;

            // Get active loans (FIFO for deduction, LIFO for revert might be safer but consistency matters)
            // We'll use FIFO for both to match standard accounting
            const loans = await query(`
                SELECT id, balance, status
                FROM employee_loans 
                WHERE employee_id = $1 AND status IN ('Active', 'Ongoing', 'Approved', 'Paid')
                ORDER BY id ASC
            `, [p.employee_id]);

            let remaining = amount;

            if (isDeduction) {
                // DEDUCT from Active/Ongoing loans
                const activeLoans = loans.rows.filter((l: any) => l.status !== 'Paid' && parseFloat(l.balance) > 0);

                for (const loan of activeLoans) {
                    if (remaining <= 0) break;

                    const currentBalance = parseFloat(loan.balance);
                    const deduction = Math.min(remaining, currentBalance);
                    const newBalance = currentBalance - deduction;

                    let newStatus = loan.status;
                    if (newBalance <= 0) newStatus = 'Paid';

                    await query(`UPDATE employee_loans SET balance = $1, status = $2 WHERE id = $3`, [newBalance, newStatus, loan.id]);
                    remaining -= deduction;
                }
            } else {
                // REVERT (Add back)
                // We add back to the most active loan, or if all paid, reactivate the last one?
                // Strategy: Find the loan that looks like it was just paid or is active
                // Simplest: Add to the most recently created loan (highest ID) that accepts payments?
                // Or better: Add to the loan with ID match? We don't have ID.
                // We'll add to the LATEST Active/Ongoing/Approved loan or LATEST Paid loan.

                // Sort by ID DESC to target newest loan first
                const targetLoans = loans.rows.sort((a: any, b: any) => b.id - a.id);

                if (targetLoans.length > 0) {
                    const loan = targetLoans[0];
                    const currentBalance = parseFloat(loan.balance);
                    const newBalance = currentBalance + remaining;

                    let newStatus = loan.status;
                    if (newStatus === 'Paid' && newBalance > 0) newStatus = 'Active'; // Reactivate

                    await query(`UPDATE employee_loans SET balance = $1, status = $2 WHERE id = $3`, [newBalance, newStatus, loan.id]);
                }
            }
        }
    } catch (error) {
        console.error('Error updating loan balances:', error);
        // Don't throw, just log to allow flow to continue (or decide if critical)
    }
}

// PATCH /api/payroll/runs/[id] - Update payroll run (approve/lock)
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;
        const [user, selectedBranch] = auth;

        const payrollRunId = params.id;
        const body = await request.json();
        const { action } = body;

        // Get payroll run
        const runResult = await query(`SELECT * FROM payroll_runs WHERE id = $1`, [payrollRunId]);
        if (runResult.rows.length === 0) {
            return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
        }

        const payrollRun = runResult.rows[0];

        // Backfill workflow_stage if missing (for legacy records) inside PATCH
        if (payrollRun.workflow_stage == null || payrollRun.workflow_stage === 0) {
            const s = (payrollRun.status || '').toLowerCase();
            if (s.includes('operations')) payrollRun.workflow_stage = 2;
            else if (s.includes('president') && !s.includes('vice')) payrollRun.workflow_stage = 3;
            else if (s.includes('vice president')) payrollRun.workflow_stage = 4;
            else if (['for release', 'approved', 'released', 'locked'].includes(s)) payrollRun.workflow_stage = 5;
            else if (s === 'draft') payrollRun.workflow_stage = 1;
        }

        // Check access
        if (!canAccessPayroll(user, payrollRun.branch)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        if (action === 'finalize') {
            console.log('[PATCH] Action: finalize');
            // HR Finalize -> Move to Stage 2 (Operations Manager Review)
            if (!['HR', 'Super Admin', 'Admin'].includes(user.role)) {
                return NextResponse.json({ error: 'Only HR Officer or Super Admin can finalize payroll' }, { status: 403 });
            }

            const currentStatus = (payrollRun.status || '').toUpperCase();

            // Check for previous success (Idempotency)
            if (payrollRun.workflow_stage >= 2 || currentStatus.includes('UNDER REVIEW')) {
                return NextResponse.json({ success: true, message: 'Payroll is already finalized and under review.' });
            }

            if (currentStatus !== 'DRAFT' && !currentStatus.includes('RETURNED')) {
                return NextResponse.json({ error: `Payroll is not in Draft state. Current status: ${payrollRun.status}` }, { status: 400 });
            }

            try {
                // Compute totals from payslips
                const totalsResult = await query(`
                    SELECT 
                        COUNT(*) as employee_count,
                        COALESCE(SUM(net_pay), 0) as total_net_pay,
                        COALESCE(SUM(gross_pay), 0) as total_gross_pay
                    FROM payslips
                    WHERE payroll_run_id = $1
                `, [payrollRunId]);

                const totals = totalsResult.rows[0];

                // Update Status to Operations Manager Review
                await query(`
                    UPDATE payroll_runs
                    SET status = 'Under Review - Operations Manager', 
                        workflow_stage = 2, 
                        current_reviewer_role = 'Operations Manager',
                        process_date = NOW(),
                        employee_count = $2,
                        total_net_pay = $3,
                        total_gross_pay = $4,
                        updated_at = NOW()
                    WHERE id = $1
                `, [payrollRunId, totals.employee_count, totals.total_net_pay, totals.total_gross_pay]);

                // Notify Operations Manager and VP (Submission Notification)
                const targetUsers = await query("SELECT id FROM users WHERE role IN ('Operations Manager', 'Vice President', 'Super Admin')");
                for (const tu of targetUsers.rows) {
                    try {
                        let formattedPeriod = '';
                        try {
                            const d1 = new Date(payrollRun.payroll_period_start);
                            const d2 = new Date(payrollRun.payroll_period_end);
                            formattedPeriod = `${d1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${d2.getDate()}, ${d2.getFullYear()}`;
                        } catch (e) {
                            formattedPeriod = `${payrollRun.payroll_period_start} to ${payrollRun.payroll_period_end}`;
                        }

                        await query(`
                            INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type, is_read, created_at, link)
                            VALUES ($1, $2, $3, $4, $5, $6, 0, NOW(), $7)
                        `, [
                            tu.id,
                            'PAYROLL_SUBMITTED',
                            'Payroll Submitted',
                            `Payroll for ${formattedPeriod} is pending approval.`,
                            payrollRunId.toString(),
                            'payroll',
                            `/payroll/${payrollRunId}`
                        ]);
                    } catch (e) { }
                }

                // Audit Log
                await query(`
                    INSERT INTO payroll_audit_log (payroll_run_id, action, performed_by, details, performed_at)
                    VALUES ($1, $2, $3, $4, $5)
                `, [payrollRunId, 'FINALIZED_BY_HR', user.id, JSON.stringify({ run_number: payrollRun.run_number, stage: 'DRAFT -> OPS REVIEW' }), new Date().toISOString()]);

                // Update Company Loan Balances
                await updateCompanyLoanBalances(payrollRunId, true);

                return NextResponse.json({ success: true, message: 'Payroll finalized and submitted for Operations Manager Review' });
            } catch (innerError: any) {
                console.error('[PATCH] Finalize Logic Error:', innerError);
                return NextResponse.json({ error: 'Finalize failed', details: innerError.message }, { status: 500 });
            }
        }

        if (action === 'approve') {
            // Check role and stage
            const isOps = user.role === 'Operations Manager';
            const isPres = user.role === 'President';
            const isSuper = user.role === 'Super Admin';

            if (!isOps && !isPres && !isSuper) {
                return NextResponse.json({ error: 'Unauthorized to approve at this stage' }, { status: 403 });
            }

            // Case 1: Operations Manager Approve (Stage 2 -> Stage 3: VP Review)
            if (payrollRun.workflow_stage === 2 || payrollRun.status === 'Under Review - Operations Manager') {
                if (!isOps && !isSuper) {
                    return NextResponse.json({ error: 'Only Operations Manager can approve at this stage' }, { status: 403 });
                }

                await query(`
                    UPDATE payroll_runs
                    SET status = 'Under Review - Vice President',
                        workflow_stage = 3,
                        current_reviewer_role = 'Vice President',
                        updated_at = NOW()
                    WHERE id = $1
                `, [payrollRunId]);

                // Notify VP
                const vpUsers = await query("SELECT id FROM users WHERE role IN ('Vice President', 'Super Admin')");
                for (const vp of vpUsers.rows) {
                    let formattedPeriod = '';
                    try {
                        const d1 = new Date(payrollRun.payroll_period_start);
                        const d2 = new Date(payrollRun.payroll_period_end);
                        formattedPeriod = `${d1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${d2.getDate()}, ${d2.getFullYear()}`;
                    } catch (e) {
                        formattedPeriod = `${payrollRun.payroll_period_start} to ${payrollRun.payroll_period_end}`;
                    }

                    await query(`
                        INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type, is_read, created_at, link)
                        VALUES ($1, $2, $3, $4, $5, $6, 0, NOW(), $7)
                    `, [
                        vp.id,
                        'PAYROLL_PENDING_VP',
                        'Payroll Awaiting VP Approval',
                        `Payroll for ${formattedPeriod} requires your approval.`,
                        payrollRunId.toString(),
                        'payroll',
                        `/payroll/${payrollRunId}`
                    ]);
                }

                await query(`
                    INSERT INTO payroll_audit_log (payroll_run_id, action, performed_by, details, performed_at)
                    VALUES ($1, $2, $3, $4, $5)
                `, [payrollRunId, 'APPROVED_BY_OPS', user.id, JSON.stringify({ run_number: payrollRun.run_number }), new Date().toISOString()]);

                return NextResponse.json({ success: true, message: 'Approved by Operations Manager. Forwarded to Vice President.' });
            }

            return NextResponse.json({ error: 'Payroll is not in a state ready for this approval action' }, { status: 400 });
        }

        if (action === 'final_approve') {
            // VP Approve -> Ready for Release
            if (user.role !== 'Vice President' && user.role !== 'Super Admin') {
                return NextResponse.json({ error: 'Only Vice President can perform final approval' }, { status: 403 });
            }

            if (payrollRun.status === 'For Release' || payrollRun.workflow_stage === 4) {
                return NextResponse.json({ success: true, message: 'Payroll is already fully approved.' });
            }

            if (payrollRun.status !== 'Under Review - Vice President' && payrollRun.workflow_stage !== 3) {
                return NextResponse.json({ error: `Payroll is not ready for VP approval. Status: ${payrollRun.status}. (Must be approved by Operations Manager First)` }, { status: 400 });
            }

            await query(`
                UPDATE payroll_runs
                SET status = 'For Release',
                workflow_stage = 4,
                current_reviewer_role = null,
                evp_review_status = 'Approved',
                evp_review_date = NOW(),
                approved_by = $1,
                approved_at = NOW(),
                updated_at = NOW()
                WHERE id = $2
                `, [user.id, payrollRunId]);

            // Audit Log
            await query(`
                INSERT INTO payroll_audit_log(payroll_run_id, action, performed_by, details, performed_at)
                VALUES($1, $2, $3, $4, $5)
                    `, [payrollRunId, 'APPROVED_BY_VP', user.id, JSON.stringify({ run_number: payrollRun.run_number }), new Date().toISOString()]);

            return NextResponse.json({ success: true, message: 'Payroll fully approved by VP. Status set to For Release.' });
        }

        if (action === 'release') {
            // For Release -> Released
            if (!['Finance', 'Super Admin', 'HR', 'Admin'].includes(user.role)) {
                return NextResponse.json({ error: 'Unauthorized to mark as released' }, { status: 403 });
            }

            // STRICT VALIDATION: Vice President Approval is mandatory
            if (payrollRun.evp_review_status !== 'Approved') {
                return NextResponse.json({
                    error: 'Payroll cannot be released. Vice President approval is pending.',
                    code: 'MISSING_VP_APPROVAL'
                }, { status: 400 });
            }

            if (payrollRun.status !== 'For Release' && payrollRun.status !== 'Approved' && payrollRun.workflow_stage !== 4) {
                return NextResponse.json({ error: `Payroll is not ready for release. Status: ${payrollRun.status}` }, { status: 400 });
            }

            await query(`
                UPDATE payroll_runs
                SET status = 'Released',
                updated_at = NOW()
                WHERE id = $1
                `, [payrollRunId]);

            // Audit Log
            await query(`
                INSERT INTO payroll_audit_log(payroll_run_id, action, performed_by, details, performed_at)
                VALUES($1, $2, $3, $4, $5)
                `, [payrollRunId, 'MARKED_RELEASED', user.id, JSON.stringify({ run_number: payrollRun.run_number }), new Date().toISOString()]);

            // Notifications
            const releaseUsers = await query("SELECT id FROM users WHERE role IN ('HR', 'Operations Manager', 'Vice President', 'Super Admin')");
            for (const ru of releaseUsers.rows) {
                try {
                    let formattedPeriod = '';
                    try {
                        const d1 = new Date(payrollRun.payroll_period_start);
                        const d2 = new Date(payrollRun.payroll_period_end);
                        formattedPeriod = `${d1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${d2.getDate()}, ${d2.getFullYear()}`;
                    } catch (e) {
                        formattedPeriod = `${payrollRun.payroll_period_start} to ${payrollRun.payroll_period_end}`;
                    }

                    await query(`
                        INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type, is_read, created_at, link)
                        VALUES ($1, $2, $3, $4, $5, $6, 0, NOW(), $7)
                    `, [
                        ru.id,
                        'PAYROLL_RELEASED',
                        'Payroll Released',
                        `Payroll for ${formattedPeriod} has been successfully released.`,
                        payrollRunId.toString(),
                        'payroll',
                        `/payroll/${payrollRunId}`
                    ]);
                } catch (e) { }
            }

            return NextResponse.json({ success: true, message: 'Payroll marked as Released.' });
        }

        if (action === 'return') {
            const { remarks } = body;
            if (!remarks) {
                return NextResponse.json({ error: 'Remarks are required for return action' }, { status: 400 });
            }

            // Determine return path
            let newStatus = '';
            let auditAction = '';
            let targetRole = '';

            if (payrollRun.status.includes('Operations Manager')) {
                // Return to HR
                if (user.role !== 'Operations Manager' && user.role !== 'Super Admin') return NextResponse.json({ error: 'Unauthorized return' }, { status: 403 });
                newStatus = 'Returned to HR';
                auditAction = 'RETURNED_TO_HR';
                targetRole = 'HR';
            } else if (payrollRun.status.includes('President') && !payrollRun.status.includes('Vice')) {
                // President returning to Operations Manager
                if (user.role !== 'President' && user.role !== 'Super Admin') return NextResponse.json({ error: 'Unauthorized return' }, { status: 403 });
                newStatus = 'Returned to Operations Manager';
                auditAction = 'RETURNED_TO_OPS';
                targetRole = 'Operations Manager';
            } else if (payrollRun.status === 'Under Review - Vice President') {
                // VP returning to President
                if (user.role !== 'Vice President' && user.role !== 'Super Admin') return NextResponse.json({ error: 'Unauthorized return' }, { status: 403 });
                newStatus = 'Returned to President';
                auditAction = 'RETURNED_TO_PRESIDENT';
                targetRole = 'President';
            } else {
                return NextResponse.json({ error: 'Cannot return from current status' }, { status: 400 });
            }

            await query(`
                UPDATE payroll_runs
                SET status = $1,
                return_remarks = $2,
                updated_at = NOW()
                WHERE id = $3
                `, [newStatus, remarks, payrollRunId]);

            try {
                // Audit Log
                await query(`
                    INSERT INTO payroll_audit_log(payroll_run_id, action, performed_by, details, performed_at)
                    VALUES($1, $2, $3, $4, $5)
                `, [payrollRunId, auditAction, user.id, JSON.stringify({ run_number: payrollRun.run_number, remarks }), new Date().toISOString()]);
            } catch (notifyError) { }

            // If returning to HR, revert loan deductions
            if (newStatus === 'Returned to HR') {
                await updateCompanyLoanBalances(payrollRunId, false);
            }

            return NextResponse.json({ success: true, message: `Payroll returned to ${targetRole}.` });
        }

        if (action === 'lock') {
            // Check permission
            const accessCheck = validatePayrollAccess(user, 'lock', payrollRun.branch);
            if (!accessCheck.allowed) {
                return NextResponse.json({ error: accessCheck.error }, { status: 403 });
            }

            if (payrollRun.status !== 'Released' && payrollRun.status !== 'Approved') {
                // Ideally only Released should be locked, but maintaining flex
                // Logic: Allow lock if VP approved.
                if (payrollRun.workflow_stage < 5) {
                    return NextResponse.json({ error: 'Payroll must be VP Approved/Released before locking.' }, { status: 400 });
                }
            }

            await query(`
                UPDATE payroll_runs
                SET status = 'locked', updated_at = NOW()
                WHERE id = $1
                `, [payrollRunId]);

            await query(`
                INSERT INTO payroll_audit_log(payroll_run_id, action, performed_by, details, performed_at)
            VALUES($1, $2, $3, $4, $5)
            `, [payrollRunId, 'LOCKED', user.id, JSON.stringify({ run_number: payrollRun.run_number }), new Date().toISOString()]);

            return NextResponse.json({ success: true, message: 'Payroll locked successfully' });
        }


        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Error updating payroll run:', error);
        return NextResponse.json(
            { error: 'Failed to update payroll run', details: error.message },
            { status: 500 }
        );
    }
}

// DELETE /api/payroll/runs/[id] - Delete payroll run
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;
        const [user, selectedBranch] = auth;

        const payrollRunId = params.id;

        // Get payroll run
        const runResult = await query(`SELECT * FROM payroll_runs WHERE id = $1`, [payrollRunId]);
        if (runResult.rows.length === 0) {
            return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
        }

        const payrollRun = runResult.rows[0];

        // Check permission first (role-based)
        const accessCheck = validatePayrollAccess(user, 'delete', payrollRun.branch);
        if (!accessCheck.allowed) {
            return NextResponse.json({ error: accessCheck.error }, { status: 403 });
        }

        // For non-admin roles, verify branch access
        if (!['Super Admin', 'Admin', 'President', 'Vice President', 'Operations Manager'].includes(user.role)) {
            if (!canAccessPayroll(user, payrollRun.branch)) {
                return NextResponse.json({ error: 'Access denied to this branch' }, { status: 403 });
            }
        }

        if (payrollRun.status === 'locked') {
            return NextResponse.json({ error: 'Cannot delete locked payroll' }, { status: 400 });
        }

        if (!payrollRun.status || payrollRun.status.toLowerCase() !== 'draft') {
            return NextResponse.json({ error: 'Only Draft payroll can be deleted.' }, { status: 400 });
        }

        // Delete payslips first
        await query(`DELETE FROM payslips WHERE payroll_run_id = $1`, [payrollRunId]);

        // Delete payroll run
        await query(`DELETE FROM payroll_runs WHERE id = $1`, [payrollRunId]);

        // Log action
        await query(`
            INSERT INTO payroll_audit_log(payroll_run_id, action, performed_by, details, performed_at)
            VALUES($1, $2, $3, $4, $5)
                `, [payrollRunId, 'DELETED', user.id, JSON.stringify({ run_number: payrollRun.run_number }), new Date().toISOString()]);

        return NextResponse.json({ success: true, message: 'Payroll run deleted' });

    } catch (error: any) {
        console.error('Error deleting payroll run:', error);
        return NextResponse.json(
            { error: 'Failed to delete payroll run', details: error.message },
            { status: 500 }
        );
    }
}
