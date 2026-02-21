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

        if (action === 'finalize') {
            // HR Finalize -> Move to Stage 2 (Ops Review)
            if (!['HR', 'Super Admin'].includes(user.role)) {
                return NextResponse.json({ error: 'Only HR Officer or Super Admin can finalize payroll' }, { status: 403 });
            }

            if (payrollRun.status !== 'DRAFT' && payrollRun.status !== 'RETURNED TO PREPARER' && payrollRun.status !== 'RETURNED TO HR') {
                return NextResponse.json({ error: 'Payroll is not in Draft state' }, { status: 400 });
            }

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

            // Update Status and set process_date
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

            // Create notification for Ops Manager (Admin)
            const opsUsers = await query("SELECT id, email FROM users WHERE role = 'Admin' OR role = 'Operations Manager'");
            for (const ops of opsUsers.rows) {
                await query(`
                    INSERT INTO notifications (user_id, title, message, is_read, created_at, link)
                    VALUES ($1, $2, $3, 0, NOW(), $4)
                `, [ops.id, 'Payroll Ready for Review', `Payroll for ${payrollRun.branch} covering ${payrollRun.payroll_period_start} to ${payrollRun.payroll_period_end} has been finalized by HR and requires your review.`, `/payroll/${payrollRunId}`]);

                if (ops.email) {
                    await sendEmail(ops.email, `Payroll Ready for Review: ${payrollRun.run_number}`,
                        `Payroll for ${payrollRun.branch} covering ${payrollRun.payroll_period_start} to ${payrollRun.payroll_period_end} has been finalized by HR and requires your review.`);
                }
            }

            // Audit Log
            await query(`
                INSERT INTO payroll_audit_log (payroll_run_id, action, performed_by, details, performed_at)
                VALUES ($1, $2, $3, $4, $5)
            `, [payrollRunId, 'FINALIZED_BY_HR', user.id, JSON.stringify({ run_number: payrollRun.run_number, stage: 'DRAFT -> OPS REVIEW' }), new Date().toISOString()]);

            return NextResponse.json({ success: true, message: 'Payroll finalized and submitted for Operations Review' });
        }

        if (action === 'approve') {
            // Ops Approve -> Move to Stage 3 (VP Review)
            if (user.role !== 'Admin' && user.role !== 'Operations Manager' && user.role !== 'Super Admin') {
                return NextResponse.json({ error: 'Only Operations Manager can approve at this stage' }, { status: 403 });
            }

            // Check if payroll is ready for Operations approval
            if (payrollRun.status !== 'Under Review - Operations Manager') {
                return NextResponse.json({
                    error: `Payroll is not ready for Operations approval. Current status: ${payrollRun.status}`
                }, { status: 400 });
            }


            try {
                await query(`
                    UPDATE payroll_runs
                    SET status = 'Under Review - Vice President',
                        updated_at = NOW()
                    WHERE id = $1
                `, [payrollRunId]);
            } catch (updateError: any) {
                console.error('SQL Update Error:', updateError);
                return NextResponse.json({
                    error: 'Database update failed',
                    details: updateError.message
                }, { status: 500 });
            }


            // Notify VP
            const vpUsers = await query("SELECT id, email FROM users WHERE role IN ('President', 'Vice President')");
            for (const vp of vpUsers.rows) {
                await query(`
                    INSERT INTO notifications (user_id, title, message, is_read, created_at, link)
                    VALUES ($1, $2, $3, 0, NOW(), $4)
                `, [vp.id, 'Payroll Approval Required', `Payroll run ${payrollRun.run_number} has been approved by Operations and is awaiting your final approval.`, `/payroll/${payrollRunId}`]);

                if (vp.email) {
                    await sendEmail(vp.email, `Payroll Pending VP Approval: ${payrollRun.run_number}`,
                        `Payroll run ${payrollRun.run_number} approved by Operations. Pending Final Approval.`);
                }
            }

            // Audit Log
            await query(`
                INSERT INTO payroll_audit_log (payroll_run_id, action, performed_by, details, performed_at)
                VALUES ($1, $2, $3, $4, $5)
            `, [payrollRunId, 'APPROVED_BY_OPS', user.id, JSON.stringify({ run_number: payrollRun.run_number }), new Date().toISOString()]);


            return NextResponse.json({ success: true, message: 'Approved by Operations Manager. Forwarded to VP.' });
        }

        if (action === 'final_approve') {
            // VP Approve -> Finalize and Lock
            if (user.role !== 'President' && user.role !== 'Vice President' && user.role !== 'Super Admin') {
                return NextResponse.json({ error: 'Only Vice President can perform final approval' }, { status: 403 });
            }

            if (payrollRun.status !== 'Under Review - Vice President') {
                return NextResponse.json({ error: 'Payroll is not ready for Final approval' }, { status: 400 });
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

            // Notify HR and Ops
            const stakeholders = await query("SELECT id, email FROM users WHERE role IN ('HR', 'Admin', 'Operations Manager')");
            for (const sh of stakeholders.rows) {
                await query(`
                    INSERT INTO notifications(user_id, title, message, is_read, created_at, link)
                    VALUES($1, $2, $3, 0, NOW(), $4)
                    `, [sh.id, 'Payroll Approved', `Payroll run ${payrollRun.run_number} has been fully approved and is now Ready for Release.`, ` / payroll / ${payrollRunId}`]);
            }

            return NextResponse.json({ success: true, message: 'Payroll fully approved. Status set to For Release.' });
        }

        if (action === 'release') {
            // For Release -> Released
            if (user.role !== 'Finance' && user.role !== 'Super Admin' && user.role !== 'HR' && user.role !== 'Admin') {
                // Assuming Finance/HR/Admin can mark as released? Requirements say "authorized user". Let's assume HR/Admin/Finance.
                return NextResponse.json({ error: 'Unauthorized to mark as released' }, { status: 403 });
            }

            if (payrollRun.status !== 'For Release' && payrollRun.status !== 'Approved') { // Allow 'Approved' just in case of transition
                return NextResponse.json({ error: 'Payroll is not ready for release' }, { status: 400 });
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

            return NextResponse.json({ success: true, message: 'Payroll marked as Released.' });
        }

        if (action === 'return') {
            const { remarks } = body;
            if (!remarks) {
                return NextResponse.json({ error: 'Remarks are required for return action' }, { status: 400 });
            }

            // Determine return path based on current status
            let newStatus = '';
            let auditAction = '';
            let targetRole = '';

            if (payrollRun.status === 'Under Review - Operations Manager') {
                // Ops returning to HR
                if (user.role !== 'Admin' && user.role !== 'Operations Manager' && user.role !== 'Super Admin') return NextResponse.json({ error: 'Unauthorized return' }, { status: 403 });
                newStatus = 'Returned to HR';
                auditAction = 'RETURNED_TO_HR';
                targetRole = 'HR';
            } else if (payrollRun.status === 'Under Review - Vice President') {
                // VP returning to Ops
                if (user.role !== 'President' && user.role !== 'Vice President' && user.role !== 'Super Admin') return NextResponse.json({ error: 'Unauthorized return' }, { status: 403 });
                newStatus = 'Returned to Operations Manager';
                auditAction = 'RETURNED_TO_OPS';
                targetRole = 'Operations Manager'; // Note: In DB role might be 'Admin' or 'Operations Manager'
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

            // Audit Log
            await query(`
                INSERT INTO payroll_audit_log(payroll_run_id, action, performed_by, details, performed_at)
            VALUES($1, $2, $3, $4, $5)
            `, [payrollRunId, auditAction, user.id, JSON.stringify({ run_number: payrollRun.run_number, remarks }), new Date().toISOString()]);

            // Notify Previous Step
            // Simplified notification logic - getting generic roles for now
            let roleQuery = "";
            if (targetRole === 'HR') roleQuery = "role = 'HR'";
            else roleQuery = "role = 'Admin' OR role = 'Operations Manager'";

            const targetUsers = await query(`SELECT id, email FROM users WHERE ${roleQuery} `);
            for (const tUser of targetUsers.rows) {
                await query(`
                    INSERT INTO notifications(user_id, title, message, is_read, created_at, link)
            VALUES($1, $2, $3, 0, NOW(), $4)
                `, [tUser.id, 'Payroll Returned', `Payroll run ${payrollRun.run_number} has been returned by ${user.username}.Remarks: ${remarks} `, ` / payroll / ${payrollRunId} `]);
            }

            return NextResponse.json({ success: true, message: `Payroll returned to ${targetRole}.` });
        }

        if (action === 'lock') {
            // Check permission
            const accessCheck = validatePayrollAccess(user, 'lock', payrollRun.branch);
            if (!accessCheck.allowed) {
                return NextResponse.json({ error: accessCheck.error }, { status: 403 });
            }

            if (payrollRun.status !== 'Approved') {
                return NextResponse.json({ error: 'Only APPROVED payrolls can be finalized' }, { status: 400 });
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
        console.error('Error details:', error.message, error.stack);
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
