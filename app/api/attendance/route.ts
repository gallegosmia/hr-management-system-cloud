import { NextRequest, NextResponse } from 'next/server';
import { getAll, query } from '@/lib/database';
import { recordAttendance, getAttendanceByDate, batchRecordAttendance, getEmployeeById, getEmployeeLeaveCount } from '@/lib/data';
import { requireBranchAuth, canModifyBranchData } from '@/lib/middleware/branch-auth';
import { filterByBranch } from '@/lib/branch-access';

export async function GET(request: NextRequest) {
    try {
        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;
        const [user, selectedBranch] = auth;

        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const employeeId = searchParams.get('employee_id');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        let results: any[] = [];

        // Security: Overriding selectedBranch for HR users or via URL parameters for Super Admins
        const branchParam = searchParams.get('branch');
        let finalSelectedBranch = selectedBranch;

        if (user.role === 'HR' && user.assigned_branch) {
            finalSelectedBranch = user.assigned_branch;
        } else if ((user.role === 'President' || user.role === 'Vice President') && branchParam) {
            finalSelectedBranch = branchParam;
        }

        if (startDate === '' || endDate === '') {
            // Explicitly requested with empty dates (e.g. invalid date entered in frontend)
            return NextResponse.json([]);
        }

        if (date) {
            results = await getAttendanceByDate(date);
        } else if (employeeId && startDate && endDate) {
            const res = await query(
                "SELECT a.*, e.branch FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.employee_id = $1 AND a.date >= $2 AND a.date <= $3",
                [parseInt(employeeId), startDate, endDate]
            );
            results = res.rows;
        } else if (startDate && endDate) {
            const res = await query(
                "SELECT a.*, e.branch FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.date >= $1 AND a.date <= $2 ORDER BY a.date DESC, a.time_in ASC",
                [startDate, endDate]
            );
            results = res.rows;
        } else {
            // Join with employees to get branch for filtering
            const res = await query("SELECT a.*, e.branch FROM attendance a JOIN employees e ON a.employee_id = e.id");
            results = res.rows;
        }

        // Apply branch level filter
        let filtered = filterByBranch(results, user.role, finalSelectedBranch);

        // EXTRA SECURITY: Strictly enforce employee-only access
        if (user.role === 'Employee') {
            filtered = filtered.filter(a => String(a.employee_id) === String(user.employee_id));
        }

        // EXTRA SECURITY: Strictly enforce HR branch access (even if filterByBranch was bypassable)
        if (user.role === 'HR' && user.assigned_branch) {
            const normalizedAssigned = user.assigned_branch.replace(/\s*branch\s*$/i, '').trim().toUpperCase();
            filtered = filtered.filter(a => {
                const branch = (a.branch || '').replace(/\s*branch\s*$/i, '').trim().toUpperCase();
                return branch === normalizedAssigned;
            });
        }

        return NextResponse.json(filtered);
    } catch (error) {
        console.error('Get attendance error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch attendance' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        
        const recordRes = await query("SELECT * FROM attendance WHERE id = $1", [parseInt(id)]);
        const record = recordRes.rows[0];

        if (record) {
            let hrUser = 'System';
            try {
                // Try grabbing session data using auth middleware natively to get real user if possible
                const authResult = await requireBranchAuth(request);
                if (!(authResult instanceof NextResponse)) {
                     hrUser = authResult[0].username;
                }
            } catch(e) {}

            try {
                await query(`
                    INSERT INTO audit_logs (hr_user, employee_id, action, details, previous_credits, new_credits)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [hrUser, record.employee_id, 'ATTENDANCE_DELETED', `Deleted ${record.status} record for ${new Date(record.date).toISOString().split('T')[0]}`, 0, 0]);
            } catch (auditError) {
                console.warn("Audit Log insert failed, table might not exist:", auditError);
            }
        }

        await query("DELETE FROM attendance WHERE id = $1", [parseInt(id)]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete attendance error:', error);
        return NextResponse.json(
            { error: 'Failed to delete record' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { date, records } = await request.json();

        if (!date || !records || !Array.isArray(records)) {
            return NextResponse.json(
                { error: 'Invalid request data' },
                { status: 400 }
            );
        }

        // --- Handle Leave Deductions ---
        for (let i = 0; i < records.length; i++) {
            let record = records[i];
            const isDeductibleLeave = record.status === 'Sick Leave' || record.status === 'Vacation Leave' || record.status === 'Emergency Leave' || record.status === 'On Leave';

            if (isDeductibleLeave) {
                // Fetch employee data to check credits
                const employeesRes = await query("SELECT id, leave_credits FROM employees WHERE id = $1", [record.employee_id]);
                const employee = employeesRes.rows[0];

                if (employee) {
                    const entitlement = employee.leave_credits || 5;
                    const year = new Date(date).getFullYear();
                    const used = await getEmployeeLeaveCount(employee.id, year);

                    // Check if current record was already counted as an active leave
                    const existingRes = await query("SELECT status FROM attendance WHERE employee_id = $1 AND date = $2", [record.employee_id, date]);
                    const existingRecord = existingRes.rows[0];
                    const wasAlreadyLeave = existingRecord && ['sick leave', 'vacation leave', 'emergency leave', 'on leave'].includes((existingRecord.status || '').toLowerCase());

                    const projectedUsed = wasAlreadyLeave ? used : used + 1;

                    if (projectedUsed <= entitlement) {
                        // Authorized leave, limit not exceeded for the year.
                        const sessionId = request.headers.get('x-session-id');
                        let hrUser = 'System (Batch Update)';
                        if (sessionId) {
                            hrUser = `HR Session [${sessionId.substring(0, 8)}]`;
                        }

                        try {
                            await query(`
                                INSERT INTO audit_logs (hr_user, employee_id, action, details, previous_credits, new_credits)
                                VALUES ($1, $2, $3, $4, $5, $6)
                            `, [hrUser, employee.id, 'LEAVE_STATUS_GRANTED', `Granted ${record.status} on ${date}. Used ${projectedUsed}/${entitlement} this year`, entitlement - used, entitlement - projectedUsed]);
                        } catch (auditError) {
                            console.warn("Audit Log insert failed, table might not exist:", auditError);
                        }

                    } else {
                        // Enforce LWOP if no credits
                        record.status = 'Leave Without Pay';
                    }
                }
            }
        }

        // Efficiently save all records in one batch after modifying their statuses
        await batchRecordAttendance(records.map(record => ({
            employee_id: record.employee_id,
            date: date,
            time_in: record.time_in || null,
            time_out: record.time_out || null,
            morning_in: record.morning_in || null,
            morning_out: record.morning_out || null,
            afternoon_in: record.afternoon_in || null,
            afternoon_out: record.afternoon_out || null,
            total_hours: record.total_hours || 0,
            status: record.status,
            remarks: record.remarks || null
        })));

        return NextResponse.json({ success: true, count: records.length });
    } catch (error: any) {
        console.error('Save attendance error:', error);
        return NextResponse.json(
            { error: `Failed to save attendance: ${error.message || String(error)}` },
            { status: 500 }
        );
    }
}
