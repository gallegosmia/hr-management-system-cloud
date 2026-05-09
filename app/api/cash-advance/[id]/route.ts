import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireBranchAuth } from '@/lib/middleware/branch-auth';
import {
    createNotification,
    createNotificationsForUsers,
    getEmployeeUserId,
    getNotificationRecipientIds,
} from '@/lib/notifications';
import { syncApprovedCashAdvanceForEmployee } from '@/lib/payroll-cash-advances';

/**
 * Cash Advance [id] API
 * GET    – Fetch single cash advance record
 * PUT    – Update status (Approve/Reject) or edit record
 * DELETE – Soft-delete (set status = 'Deleted')
 */

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;
        const [user] = auth;

        const id = parseInt(params.id);
        if (isNaN(id)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }

        const res = await query(
            `SELECT ca.*, e.branch, e.employee_id as emp_code, e.position, e.department
             FROM cash_advances ca
             LEFT JOIN employees e ON ca.employee_id = e.id
             WHERE ca.id = $1`,
            [id]
        );

        if (res.rows.length === 0) {
            return NextResponse.json({ error: 'Cash advance not found' }, { status: 404 });
        }

        const record = res.rows[0];

        // Employee can only see their own records
        if (user.role === 'Employee' && String(record.employee_id) !== String(user.employee_id)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        return NextResponse.json(record);
    } catch (error: any) {
        console.error('[Cash Advance GET/:id] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch cash advance', details: error.message }, { status: 500 });
    }
}

/**
 * Workflow Statuses:
 *   Pending                        – just submitted by HR/Employee
 *   For Branch Manager Review      – awaiting Branch Manager action
 *   For EVP Approval               – Branch Manager approved, awaiting EVP
 *   Approved                       – EVP approved (final)
 *   Rejected                       – rejected at any stage
 */

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;
        const [user] = auth;

        const allowedRoles = ['HR', 'Admin', 'President', 'Vice President', 'Manager', 'Operations Manager'];
        if (!allowedRoles.includes(user.role) && user.username !== 'superadmin') {
            return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 });
        }

        const id = parseInt(params.id);
        if (isNaN(id)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }

        // Fetch current record
        const existingRes = await query(`SELECT * FROM cash_advances WHERE id = $1`, [id]);
        if (existingRes.rows.length === 0) {
            return NextResponse.json({ error: 'Cash advance not found' }, { status: 404 });
        }
        const current = existingRes.rows[0];

        const body = await request.json();
        const { action, approved_amount, remarks } = body;
        // action = 'approve' | 'reject'

        if (!action || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Action must be "approve" or "reject".' }, { status: 400 });
        }

        const updates: string[] = [];
        const values: any[] = [];
        let idx = 1;
        let message = '';

        if (action === 'reject') {
            // Rejection is allowed at any stage
            updates.push(`status = $${idx++}`);
            values.push('Rejected');
            if (remarks) { updates.push(`remarks = $${idx++}`); values.push(remarks); }
            message = 'Cash advance rejected.';

        } else if (action === 'approve') {
            const currentStatus = (current.status || '').trim();

            // ── Stage 1: Pending → For Branch Manager Review (HR/Employee submits, auto-forward) ──
            // This transition happens on POST. If the record is still "Pending", a Manager approves it.

            if (currentStatus === 'Pending' || currentStatus === 'For Branch Manager Review') {
                // Branch Manager (or superadmin) moves it to EVP
                const canReviewAsBM = ['Manager', 'Admin'].includes(user.role) || user.username === 'superadmin';
                // Also allow President/VP to skip through
                const isExec = ['President', 'Vice President'].includes(user.role);

                if (isExec) {
                    // Executives can give final approval directly
                    updates.push(`status = $${idx++}`); values.push('Approved');
                    updates.push(`date_approved = NOW()`);
                    updates.push(`approved_by = $${idx++}`); values.push(user.id);
                    const amt = approved_amount !== undefined ? approved_amount : current.requested_amount;
                    updates.push(`approved_amount = $${idx++}`); values.push(amt);
                    message = 'Cash advance fully approved by EVP.';
                } else if (canReviewAsBM) {
                    updates.push(`status = $${idx++}`); values.push('For EVP Approval');
                    if (remarks) { updates.push(`remarks = $${idx++}`); values.push(remarks); }
                    message = 'Approved by Branch Manager. Forwarded to EVP for final approval.';
                } else {
                    return NextResponse.json({ error: 'Only the Branch Manager can approve at this stage.' }, { status: 403 });
                }

            } else if (currentStatus === 'For EVP Approval') {
                // ── Stage 2: EVP gives final approval ──
                const isEVP = ['President', 'Vice President'].includes(user.role) || user.username === 'superadmin';
                if (!isEVP) {
                    return NextResponse.json({ error: 'Only the Executive Vice President can give final approval.' }, { status: 403 });
                }
                updates.push(`status = $${idx++}`); values.push('Approved');
                updates.push(`date_approved = NOW()`);
                updates.push(`approved_by = $${idx++}`); values.push(user.id);
                const amt = approved_amount !== undefined ? approved_amount : current.requested_amount;
                updates.push(`approved_amount = $${idx++}`); values.push(amt);
                if (remarks) { updates.push(`remarks = $${idx++}`); values.push(remarks); }
                message = 'Cash advance approved by EVP. Final approval granted.';

            } else if (currentStatus === 'Approved') {
                return NextResponse.json({ error: 'This cash advance is already approved.' }, { status: 400 });
            } else if (currentStatus === 'Rejected') {
                return NextResponse.json({ error: 'This cash advance has been rejected and cannot be approved.' }, { status: 400 });
            } else {
                return NextResponse.json({ error: `Cannot approve from status: ${currentStatus}` }, { status: 400 });
            }
        }

        updates.push(`updated_at = NOW()`);
        values.push(id);
        const sql = `UPDATE cash_advances SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
        const result = await query(sql, values);
        const updated = result.rows[0];

        if (updated.status === 'Approved') {
            try {
                await syncApprovedCashAdvanceForEmployee(Number(updated.employee_id), updated.cutoff_period);
            } catch (syncError) {
                console.error('[Cash Advance PUT/:id] Failed to sync approved cash advance to payroll:', syncError);
            }
        }

        try {
            if (updated.status === 'For EVP Approval') {
                const recipients = await getNotificationRecipientIds({
                    roles: ['President', 'Vice President'],
                    branch: updated.branch,
                });
                await createNotificationsForUsers(recipients, {
                    type: 'CASH_ADVANCE_PENDING_EVP',
                    title: 'Cash Advance Pending EVP Approval',
                    message: `${updated.employee_name} has a cash advance request awaiting final approval.`,
                    link: `/cash-advance/${id}`,
                    referenceId: `cash-advance-${id}-evp-review`,
                    severity: 'high',
                });
            }

            if (updated.status === 'Approved' || updated.status === 'Rejected') {
                const ownerUserId = await getEmployeeUserId(Number(current.employee_id));
                if (ownerUserId) {
                    await createNotification({
                        userId: ownerUserId,
                        type: updated.status === 'Approved' ? 'CASH_ADVANCE_APPROVED' : 'CASH_ADVANCE_REJECTED',
                        title: updated.status === 'Approved' ? 'Cash Advance Approved' : 'Cash Advance Rejected',
                        message: updated.status === 'Approved'
                            ? `Your cash advance request was approved for PHP ${Number(updated.approved_amount || updated.requested_amount || 0).toLocaleString()}.`
                            : `Your cash advance request was rejected.${remarks ? ` Remarks: ${remarks}` : ''}`,
                        link: `/cash-advance/${id}`,
                        referenceId: `cash-advance-${id}-${updated.status.toLowerCase()}`,
                        severity: updated.status === 'Approved' ? 'medium' : 'high',
                    });
                }
            }
        } catch (notifyError) {
            console.error('[Cash Advance PUT/:id] Failed to create notification:', notifyError);
        }

        return NextResponse.json({
            success: true,
            cash_advance: updated,
            message
        });

    } catch (error: any) {
        console.error('[Cash Advance PUT/:id] Error:', error);
        return NextResponse.json({ error: 'Failed to update cash advance', details: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;
        const [user] = auth;

        const adminRoles = ['HR', 'Admin', 'President', 'Vice President', 'Manager', 'Operations Manager'];
        if (!adminRoles.includes(user.role) && user.username !== 'superadmin') {
            return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 });
        }

        const id = parseInt(params.id);
        if (isNaN(id)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }

        // Soft delete
        await query(
            `UPDATE cash_advances SET status = 'Deleted', updated_at = NOW() WHERE id = $1`,
            [id]
        );

        return NextResponse.json({ success: true, message: 'Cash advance deleted.' });
    } catch (error: any) {
        console.error('[Cash Advance DELETE/:id] Error:', error);
        return NextResponse.json({ error: 'Failed to delete cash advance', details: error.message }, { status: 500 });
    }
}
