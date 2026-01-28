import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { format } from 'date-fns';

// Checkpoint sequence
const CHECKPOINTS = ['morning_in', 'morning_out', 'afternoon_in', 'afternoon_out'];
const CHECKPOINT_LABELS: Record<string, string> = {
    'morning_in': 'Morning Check-In',
    'morning_out': 'Morning Check-Out',
    'afternoon_in': 'Afternoon Check-In',
    'afternoon_out': 'Afternoon Check-Out'
};

export async function POST(request: NextRequest) {
    try {
        const { employee_id, device_info, method = 'QR Scan' } = await request.json();

        if (!employee_id) {
            return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
        }

        // 1. Fetch employee details
        const empRes = await query(
            'SELECT id, employee_id, first_name, last_name, middle_name, department, position, employment_status, profile_picture FROM employees WHERE employee_id = $1',
            [employee_id]
        );

        if (empRes.rowCount === 0) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        const employee = empRes.rows[0];

        // 2. Check if active
        const inactiveStatuses = ['Terminated', 'Resigned'];
        if (inactiveStatuses.includes(employee.employment_status)) {
            return NextResponse.json({ error: 'Cannot log attendance for inactive employees' }, { status: 403 });
        }

        const today = format(new Date(), 'yyyy-MM-dd');
        const now = format(new Date(), 'HH:mm:ss');
        const currentTime = new Date();

        // 3. Get or create today's attendance record
        let attendanceRes = await query(
            'SELECT * FROM attendance WHERE employee_id = $1 AND date = $2',
            [employee.id, today]
        );

        let attendance = attendanceRes.rows[0];
        let isNewRecord = false;

        if (!attendance) {
            // Create new attendance record for today
            const insertRes = await query(
                `INSERT INTO attendance (employee_id, date, status, created_at) 
                 VALUES ($1, $2, 'Present', CURRENT_TIMESTAMP) 
                 RETURNING *`,
                [employee.id, today]
            );
            attendance = insertRes.rows[0];
            isNewRecord = true;
        }

        // 4. Check if attendance is locked (payroll finalized)
        if (attendance.is_locked) {
            return NextResponse.json({
                error: 'Attendance locked. Payroll has been finalized for this period.'
            }, { status: 403 });
        }

        // 5. Determine the next checkpoint
        let nextCheckpoint: string | null = null;
        for (const checkpoint of CHECKPOINTS) {
            if (!attendance[checkpoint]) {
                nextCheckpoint = checkpoint;
                break;
            }
        }

        if (!nextCheckpoint) {
            return NextResponse.json({
                error: 'All checkpoints completed for today',
                message: 'You have already completed all 4 checkpoints for today.',
                checkpoints: {
                    morning_in: attendance.morning_in,
                    morning_out: attendance.morning_out,
                    afternoon_in: attendance.afternoon_in,
                    afternoon_out: attendance.afternoon_out
                }
            }, { status: 400 });
        }

        // 6. Prevent duplicate scans within the same minute
        const prevCheckpointIndex = CHECKPOINTS.indexOf(nextCheckpoint) - 1;
        if (prevCheckpointIndex >= 0) {
            const prevCheckpoint = CHECKPOINTS[prevCheckpointIndex];
            const prevTime = attendance[prevCheckpoint];
            if (prevTime) {
                const prevDate = new Date(`${today}T${prevTime}`);
                const diffMs = currentTime.getTime() - prevDate.getTime();
                if (diffMs < 60000) { // Less than 1 minute
                    return NextResponse.json({
                        error: 'Please wait at least 1 minute between checkpoints'
                    }, { status: 429 });
                }
            }
        }

        // 7. Validate checkpoint sequence
        // Morning Check-Out requires Morning Check-In
        if (nextCheckpoint === 'morning_out' && !attendance.morning_in) {
            return NextResponse.json({
                error: 'Morning Check-In is required before Morning Check-Out'
            }, { status: 400 });
        }
        // Afternoon Check-In requires Morning Check-Out
        if (nextCheckpoint === 'afternoon_in' && !attendance.morning_out) {
            return NextResponse.json({
                error: 'Morning Check-Out is required before Afternoon Check-In'
            }, { status: 400 });
        }
        // Afternoon Check-Out requires Afternoon Check-In
        if (nextCheckpoint === 'afternoon_out' && !attendance.afternoon_in) {
            return NextResponse.json({
                error: 'Afternoon Check-In is required before Afternoon Check-Out'
            }, { status: 400 });
        }

        // 8. Record the checkpoint
        const deviceColumn = `${nextCheckpoint}_device`;
        const methodColumn = `${nextCheckpoint}_method`;

        await query(
            `UPDATE attendance 
             SET ${nextCheckpoint} = $1, 
                 ${deviceColumn} = $2, 
                 ${methodColumn} = $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [now, device_info || 'Kiosk', method, attendance.id]
        );

        // 9. Calculate worked hours if applicable
        let morningHours = attendance.morning_hours || 0;
        let afternoonHours = attendance.afternoon_hours || 0;

        if (nextCheckpoint === 'morning_out' && attendance.morning_in) {
            const inTime = new Date(`${today}T${attendance.morning_in}`);
            const outTime = new Date(`${today}T${now}`);
            morningHours = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60);
            morningHours = Math.round(morningHours * 100) / 100;
        }

        if (nextCheckpoint === 'afternoon_out' && attendance.afternoon_in) {
            const inTime = new Date(`${today}T${attendance.afternoon_in}`);
            const outTime = new Date(`${today}T${now}`);
            afternoonHours = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60);
            afternoonHours = Math.round(afternoonHours * 100) / 100;
        }

        const totalHours = Math.round((morningHours + afternoonHours) * 100) / 100;

        // Update computed hours
        await query(
            `UPDATE attendance 
             SET morning_hours = $1, afternoon_hours = $2, total_hours = $3 
             WHERE id = $4`,
            [morningHours, afternoonHours, totalHours, attendance.id]
        );

        // 10. Also update legacy columns for backward compatibility
        if (nextCheckpoint === 'morning_in') {
            await query(
                `UPDATE attendance SET time_in = $1, device_type = $2 WHERE id = $3`,
                [now, device_info || 'Kiosk', attendance.id]
            );
        }
        if (nextCheckpoint === 'afternoon_out') {
            await query(
                `UPDATE attendance SET time_out = $1 WHERE id = $2`,
                [now, attendance.id]
            );
        }

        // 11. Audit Log
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        try {
            await query(
                'INSERT INTO audit_logs (user_id, action, details, ip_address, created_at) VALUES ($1, $2, $3, $4, $5)',
                [
                    employee.id,
                    'ATTENDANCE_CHECKPOINT',
                    JSON.stringify({
                        checkpoint: nextCheckpoint,
                        label: CHECKPOINT_LABELS[nextCheckpoint],
                        device: device_info || 'Kiosk',
                        method,
                        time: now
                    }),
                    ip,
                    new Date().toISOString()
                ]
            );
        } catch (auditErr) {
            console.error('Failed to log audit:', auditErr);
        }

        // 12. Return success response
        return NextResponse.json({
            success: true,
            message: `${CHECKPOINT_LABELS[nextCheckpoint]} recorded successfully`,
            checkpoint: nextCheckpoint,
            checkpoint_label: CHECKPOINT_LABELS[nextCheckpoint],
            employee: {
                ...employee,
                logged_at: `${today} ${now}`
            },
            attendance: {
                date: today,
                morning_in: nextCheckpoint === 'morning_in' ? now : attendance.morning_in,
                morning_out: nextCheckpoint === 'morning_out' ? now : attendance.morning_out,
                afternoon_in: nextCheckpoint === 'afternoon_in' ? now : attendance.afternoon_in,
                afternoon_out: nextCheckpoint === 'afternoon_out' ? now : attendance.afternoon_out,
                morning_hours: morningHours,
                afternoon_hours: afternoonHours,
                total_hours: totalHours
            }
        });

    } catch (error: any) {
        console.error('Scan Error:', error);
        return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
    }
}
