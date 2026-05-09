import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireBranchAuth } from '@/lib/middleware/branch-auth';
import { filterByBranch } from '@/lib/branch-access';
import { getCashAdvanceCutoff } from '@/lib/cash-advance-cutoff';
import { createNotificationsForUsers, getNotificationRecipientIds } from '@/lib/notifications';

/**
 * Cash Advance API
 * GET  – List cash advances (filtered by branch, employee, status)
 * POST – Create a new cash advance request with working-days validation
 */

// ─── Helper: determine current cutoff period ───────────────────────────
function getCurrentCutoff(): { label: string; startDate: string; endDate: string } {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const day = now.getDate();

    if (day <= 15) {
        return {
            label: `${y}-${m}-A`,            // e.g. "2026-05-A" = 1st–15th
            startDate: `${y}-${m}-01`,
            endDate: `${y}-${m}-15`,
        };
    } else {
        const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
        return {
            label: `${y}-${m}-B`,            // e.g. "2026-05-B" = 16th–30/31st
            startDate: `${y}-${m}-16`,
            endDate: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
        };
    }
}

// ─── Helper: count working days from attendance ────────────────────────
async function getWorkingDays(employeeId: number, startDate: string, endDate: string): Promise<number> {
    const res = await query(
        `SELECT COUNT(*) as cnt FROM attendance
         WHERE employee_id = $1
           AND date >= $2
           AND date <= $3
           AND LOWER(status) IN ('present', 'half day', 'holiday', 'overtime', 'late')`,
        [employeeId, startDate, endDate]
    );
    return Number(res.rows[0]?.cnt || 0);
}

// ─── GET ───────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    try {
        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;
        const [user, selectedBranch] = auth;

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employee_id');
        const status = searchParams.get('status');
        const cutoff = searchParams.get('cutoff');

        let sql = `
            SELECT ca.*, e.branch
            FROM cash_advances ca
            LEFT JOIN employees e ON ca.employee_id = e.id
            WHERE ca.status != 'Deleted'
        `;
        const params: any[] = [];
        let idx = 1;

        if (employeeId) {
            sql += ` AND ca.employee_id = $${idx++}`;
            params.push(parseInt(employeeId));
        }
        if (status && status !== 'All') {
            sql += ` AND ca.status = $${idx++}`;
            params.push(status);
        }
        if (cutoff) {
            sql += ` AND ca.cutoff_period = $${idx++}`;
            params.push(cutoff);
        }

        sql += ` ORDER BY ca.date_requested DESC`;

        const res = await query(sql, params);
        let results = res.rows;

        // Branch-level filtering
        results = filterByBranch(results, user.role, selectedBranch);

        // Employee-only: restrict to own records
        if (user.role === 'Employee') {
            results = results.filter((r: any) => String(r.employee_id) === String(user.employee_id));
        }

        return NextResponse.json(results);
    } catch (error: any) {
        console.error('[Cash Advance GET] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch cash advances', details: error.message }, { status: 500 });
    }
}

// ─── POST ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;
        const [user] = auth;

        const body = await request.json();
        const { employee_id, requested_amount, reason } = body;

        if (!employee_id || !requested_amount || requested_amount <= 0) {
            return NextResponse.json(
                { error: 'Employee and a valid requested amount are required.' },
                { status: 400 }
            );
        }

        // Fetch employee details
        const empRes = await query(`SELECT * FROM employees WHERE id = $1`, [employee_id]);
        const employee = empRes.rows[0];
        if (!employee) {
            return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
        }

        // Parse daily rate from salary_info JSON
        let dailyRate = 0;
        try {
            const salaryInfo = typeof employee.salary_info === 'string'
                ? JSON.parse(employee.salary_info)
                : employee.salary_info;
            dailyRate = Number(salaryInfo?.daily_rate || 0);
            if (!dailyRate && salaryInfo?.monthly_salary) {
                dailyRate = Number(salaryInfo.monthly_salary) / 30;
            }
        } catch (_) {}

        if (dailyRate <= 0) {
            return NextResponse.json(
                { error: 'Employee has no configured daily rate. Please set up compensation first.' },
                { status: 400 }
            );
        }

        // Auto-calculate working days for current cutoff
        const cutoff = getCashAdvanceCutoff();
        const workingDays = await getWorkingDays(employee.id, cutoff.startDate, cutoff.endDate);
        const allowableCA = Math.round(dailyRate * workingDays * 100) / 100;

        // Check existing approved/in-progress CAs in this cutoff
        const existingRes = await query(
            `SELECT COALESCE(SUM(
                CASE WHEN status = 'Approved' THEN approved_amount
                     ELSE requested_amount END
            ), 0) as total_used
             FROM cash_advances
             WHERE employee_id = $1
               AND cutoff_period = $2
               AND status IN ('Approved', 'For Branch Manager Review', 'For EVP Approval')`,
            [employee.id, cutoff.label]
        );
        const totalUsed = Number(existingRes.rows[0]?.total_used || 0);
        const remainingAllowable = allowableCA - totalUsed;

        if (requested_amount > remainingAllowable) {
            return NextResponse.json({
                error: 'Requested amount exceeds allowable cash advance based on working days.',
                details: {
                    daily_rate: dailyRate,
                    working_days: workingDays,
                    allowable_ca: allowableCA,
                    already_used: totalUsed,
                    remaining: remainingAllowable,
                    requested: requested_amount,
                }
            }, { status: 400 });
        }

        const employeeName = `${employee.first_name} ${employee.last_name}`;

        // Insert record
        const insertRes = await query(
            `INSERT INTO cash_advances
             (employee_id, employee_name, daily_rate, working_days, allowable_ca,
              requested_amount, reason, branch, cutoff_period, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'For Branch Manager Review')
             RETURNING *`,
            [
                employee.id,
                employeeName,
                dailyRate,
                workingDays,
                allowableCA,
                requested_amount,
                reason || null,
                employee.branch || null,
                cutoff.label,
            ]
        );

        try {
            const recipients = await getNotificationRecipientIds({
                roles: ['Manager', 'Admin'],
                branch: employee.branch,
            });
            await createNotificationsForUsers(recipients, {
                type: 'CASH_ADVANCE_SUBMITTED',
                title: 'Cash Advance Pending Review',
                message: `${employeeName} requested a cash advance of PHP ${Number(requested_amount).toLocaleString()}.`,
                link: `/cash-advance/${insertRes.rows[0].id}`,
                referenceId: `cash-advance-${insertRes.rows[0].id}-bm-review`,
                severity: 'high',
            });
        } catch (notifyError) {
            console.error('[Cash Advance POST] Failed to notify reviewers:', notifyError);
        }

        return NextResponse.json({
            success: true,
            cash_advance: insertRes.rows[0],
            message: `Cash advance request of ₱${Number(requested_amount).toLocaleString()} submitted. Awaiting Branch Manager review.`
        }, { status: 201 });

    } catch (error: any) {
        console.error('[Cash Advance POST] Error:', error);
        return NextResponse.json({ error: 'Failed to create cash advance request', details: error.message }, { status: 500 });
    }
}
