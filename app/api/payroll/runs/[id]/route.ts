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
    try {
        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;
        const [user, selectedBranch] = auth;

        const payrollRunId = params.id;

        // Get payroll run
        const runResult = await query(`
            SELECT 
                pr.*,
                u.username as created_by_name,
                a.username as approved_by_name
            FROM payroll_runs pr
            LEFT JOIN users u ON pr.created_by = u.id
            LEFT JOIN users a ON pr.approved_by = a.id
            WHERE pr.id = $1
        `, [payrollRunId]);

        if (runResult.rows.length === 0) {
            return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
        }

        const payrollRun = runResult.rows[0];

        // Check access
        if (!canAccessPayroll(user, payrollRun.branch)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Get payslips
        const payslipsResult = await query(`
            SELECT 
                ps.*,
                e.employee_id as employee_number,
                e.first_name,
                e.last_name,
                e.department,
                e.position,
                e.branch,
                (
                    SELECT COALESCE(SUM(balance), 0)
                    FROM employee_loans el
                    WHERE el.employee_id = e.id 
                    AND el.status IN ('Active', 'Ongoing', 'Approved') 
                    AND el.balance > 0
                ) as company_loan_balance
            FROM payslips ps
            JOIN employees e ON ps.employee_id = e.id
            WHERE ps.payroll_run_id = $1
            ORDER BY e.last_name, e.first_name
        `, [payrollRunId]);

        return NextResponse.json({
            payrollRun,
            payslips: payslipsResult.rows
        });

    } catch (error: any) {
        console.error('Error fetching payroll run:', error);
        return NextResponse.json(
            { error: 'Failed to fetch payroll run', details: error.message },
            { status: 500 }
        );
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

        // Check access
        if (!canAccessPayroll(user, payrollRun.branch)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        if (action === 'approve') {
            const workflowStage = payrollRun.workflow_stage || 0;
            const currentStatus = payrollRun.status;

            if (workflowStage === 0 || currentStatus === 'DRAFT' || currentStatus === 'RETURNED TO PREPARER') {
                // Preparer finalized -> Move to Stage 1 (HR Review)
                // Any authorized payroll person can finalize a draft
                await query(`
                    UPDATE payroll_runs
                    SET status = 'FOR HR REVIEW', 
                        workflow_stage = 1, 
                        current_reviewer_role = 'HR Officer',
                        updated_at = NOW()
                    WHERE id = $1
                `, [payrollRunId]);

                await query(`
                    INSERT INTO audit_logs (user_id, action, details)
                    VALUES ($1, $2, $3)
                `, [user.id, 'PAYROLL_FINALIZED', JSON.stringify({ run_number: payrollRun.run_number, stage: 'DRAFT -> HR REVIEW' })]);

                // Notify HR Officers
                const hrUsers = await query("SELECT email FROM users WHERE role = 'HR' AND email IS NOT NULL");
                for (const hr of hrUsers.rows) {
                    await sendEmail(hr.email, `Payroll Pending Review: ${payrollRun.run_number}`,
                        `Payroll run ${payrollRun.run_number} has been finalized and is now pending HR review.`);
                }

                return NextResponse.json({ success: true, message: 'Payroll submitted for HR Review' });
            }

            if (workflowStage === 1) {
                // HR Review Status Update
                if (user.role !== 'HR' && user.role !== 'Super Admin') {
                    return NextResponse.json({ error: 'Only HR Officer can approve at this stage' }, { status: 403 });
                }

                await query(`
                    UPDATE payroll_runs
                    SET status = 'FOR OPERATIONS REVIEW',
                        workflow_stage = 2,
                        current_reviewer_role = 'Operations Manager',
                        hr_review_status = 'Approved',
                        hr_review_date = NOW(),
                        updated_at = NOW()
                    WHERE id = $1
                `, [payrollRunId]);

                await query(`
                    INSERT INTO audit_logs (user_id, action, details)
                    VALUES ($1, $2, $3)
                `, [user.id, 'PAYROLL_HR_APPROVED', JSON.stringify({ run_number: payrollRun.run_number })]);

                // Notify Operations Managers
                const opsUsers = await query("SELECT email FROM users WHERE role = 'Admin' AND email IS NOT NULL");
                for (const admin of opsUsers.rows) {
                    await sendEmail(admin.email, `Payroll Pending Operations Review: ${payrollRun.run_number}`,
                        `Payroll run ${payrollRun.run_number} has been approved by HR and is now pending Operations Manager review.`);
                }

                return NextResponse.json({ success: true, message: 'HR Officer approved. Moved to Operations Review.' });
            }

            if (workflowStage === 2) {
                // Operations Review Status Update
                if (user.role !== 'Admin' && user.role !== 'Super Admin') {
                    return NextResponse.json({ error: 'Only Operations Manager can approve at this stage' }, { status: 403 });
                }

                await query(`
                    UPDATE payroll_runs
                    SET status = 'FOR EVP APPROVAL',
                        workflow_stage = 3,
                        current_reviewer_role = 'Executive Vice President',
                        operations_review_status = 'Approved',
                        operations_review_date = NOW(),
                        updated_at = NOW()
                    WHERE id = $1
                `, [payrollRunId]);

                await query(`
                    INSERT INTO audit_logs (user_id, action, details)
                    VALUES ($1, $2, $3)
                `, [user.id, 'PAYROLL_OPERATIONS_APPROVED', JSON.stringify({ run_number: payrollRun.run_number })]);

                // Notify EVPs
                const evpUsers = await query("SELECT email FROM users WHERE role IN ('President', 'Vice President') AND email IS NOT NULL");
                for (const evp of evpUsers.rows) {
                    await sendEmail(evp.email, `Payroll Pending EVP Approval: ${payrollRun.run_number}`,
                        `Payroll run ${payrollRun.run_number} has been approved by Operations and is now pending final EVP approval.`);
                }

                return NextResponse.json({ success: true, message: 'Operations Manager approved. Moved to EVP Approval.' });
            }

            if (workflowStage === 3) {
                // EVP Final Approval
                if (user.role !== 'President' && user.role !== 'Vice President' && user.role !== 'Super Admin') {
                    return NextResponse.json({ error: 'Only EVP can approve at this stage' }, { status: 403 });
                }

                await query(`
                    UPDATE payroll_runs
                    SET status = 'APPROVED',
                        workflow_stage = 4,
                        current_reviewer_role = null,
                        evp_review_status = 'Approved',
                        evp_review_date = NOW(),
                        approved_by = $1,
                        approved_at = NOW(),
                        updated_at = NOW()
                    WHERE id = $2
                `, [user.id, payrollRunId]);

                await query(`
                    INSERT INTO audit_logs (user_id, action, details)
                    VALUES ($1, $2, $3)
                `, [user.id, 'PAYROLL_EVP_APPROVED', JSON.stringify({ run_number: payrollRun.run_number })]);

                // Notify Preparer and Finance
                const preparer = await query("SELECT email FROM users WHERE id = $1", [payrollRun.created_by]);
                if (preparer.rows[0]?.email) {
                    await sendEmail(preparer.rows[0].email, `Payroll APPROVED: ${payrollRun.run_number}`,
                        `Congratulations! Payroll run ${payrollRun.run_number} has received final EVP approval and is now locked.`);
                }

                return NextResponse.json({ success: true, message: 'EVP Final Approval complete. Payroll is now APPROVED and Locked.' });
            }

            return NextResponse.json({ error: 'Invalid workflow stage for approval' }, { status: 400 });

        } else if (action === 'return') {
            const { remarks } = body;
            if (!remarks) {
                return NextResponse.json({ error: 'Remarks are required for return action' }, { status: 400 });
            }

            const workflowStage = payrollRun.workflow_stage || 0;

            if (workflowStage === 1) {
                // HR Return to Preparer
                if (user.role !== 'HR' && user.role !== 'Super Admin') {
                    return NextResponse.json({ error: 'Only HR Officer can return at this stage' }, { status: 403 });
                }

                await query(`
                    UPDATE payroll_runs
                    SET status = 'RETURNED TO PREPARER',
                        workflow_stage = 0,
                        current_reviewer_role = 'Payroll Preparer',
                        hr_review_status = 'Returned',
                        return_remarks = $1,
                        updated_at = NOW()
                    WHERE id = $2
                `, [remarks, payrollRunId]);

                // Notify Preparer
                const preparer = await query("SELECT email FROM users WHERE id = $1", [payrollRun.created_by]);
                if (preparer.rows[0]?.email) {
                    await sendEmail(preparer.rows[0].email, `Payroll Returned for Correction: ${payrollRun.run_number}`,
                        `Payroll run ${payrollRun.run_number} was returned by HR with the following remarks: ${remarks}`);
                }

                return NextResponse.json({ success: true, message: 'Payroll returned to preparer.' });
            }

            if (workflowStage === 2) {
                // Operations Return to HR
                if (user.role !== 'Admin' && user.role !== 'Super Admin') {
                    return NextResponse.json({ error: 'Only Operations Manager can return at this stage' }, { status: 403 });
                }

                await query(`
                    UPDATE payroll_runs
                    SET status = 'RETURNED TO HR',
                        workflow_stage = 1,
                        current_reviewer_role = 'HR Officer',
                        operations_review_status = 'Returned',
                        return_remarks = $1,
                        updated_at = NOW()
                    WHERE id = $2
                `, [remarks, payrollRunId]);

                return NextResponse.json({ success: true, message: 'Payroll returned to HR Officer.' });
            }

            if (workflowStage === 3) {
                // EVP Return to HR
                if (user.role !== 'President' && user.role !== 'Vice President' && user.role !== 'Super Admin') {
                    return NextResponse.json({ error: 'Only EVP can return at this stage' }, { status: 403 });
                }

                await query(`
                    UPDATE payroll_runs
                    SET status = 'RETURNED TO HR',
                        workflow_stage = 1,
                        current_reviewer_role = 'HR Officer',
                        evp_review_status = 'Returned',
                        return_remarks = $1,
                        updated_at = NOW()
                    WHERE id = $2
                `, [remarks, payrollRunId]);

                return NextResponse.json({ success: true, message: 'Payroll returned to HR Officer.' });
            }

            return NextResponse.json({ error: 'Invalid workflow stage for return' }, { status: 400 });

        } else if (action === 'lock') {
            // Check permission
            const accessCheck = validatePayrollAccess(user, 'lock', payrollRun.branch);
            if (!accessCheck.allowed) {
                return NextResponse.json({ error: accessCheck.error }, { status: 403 });
            }

            if (payrollRun.status !== 'APPROVED') {
                return NextResponse.json({ error: 'Only APPROVED payrolls can be finalized' }, { status: 400 });
            }

            await query(`
                UPDATE payroll_runs
                SET status = 'locked', updated_at = NOW()
                WHERE id = $1
            `, [payrollRunId]);

            await query(`
                INSERT INTO audit_logs (user_id, action, details)
                VALUES ($1, $2, $3)
            `, [user.id, 'PAYROLL_LOCKED', JSON.stringify({ run_number: payrollRun.run_number })]);

            return NextResponse.json({ success: true, message: 'Payroll locked successfully' });

        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

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

        // Check access
        if (!canAccessPayroll(user, payrollRun.branch)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Check permission
        const accessCheck = validatePayrollAccess(user, 'delete', payrollRun.branch);
        if (!accessCheck.allowed) {
            return NextResponse.json({ error: accessCheck.error }, { status: 403 });
        }

        if (payrollRun.status === 'locked') {
            return NextResponse.json({ error: 'Cannot delete locked payroll' }, { status: 400 });
        }

        // Delete payslips first
        await query(`DELETE FROM payslips WHERE payroll_run_id = $1`, [payrollRunId]);

        // Delete payroll run
        await query(`DELETE FROM payroll_runs WHERE id = $1`, [payrollRunId]);

        // Log action
        await query(`
            INSERT INTO payroll_audit_log (payroll_run_id, action, performed_by, details)
            VALUES ($1, $2, $3, $4)
        `, [payrollRunId, 'DELETED', user.id, JSON.stringify({ run_number: payrollRun.run_number })]);

        return NextResponse.json({ success: true, message: 'Payroll run deleted' });

    } catch (error: any) {
        console.error('Error deleting payroll run:', error);
        return NextResponse.json(
            { error: 'Failed to delete payroll run', details: error.message },
            { status: 500 }
        );
    }
}
