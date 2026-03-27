import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// Allowed kiosk device IDs for security
const ALLOWED_DEVICES = ['KIOSK-1', 'KIOSK-2', 'KIOSK-3', 'MOBILE-NATIVE-KIOSK'];

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { employee_id, device_id } = body;

        // --- Security: Validate device_id ---
        if (!device_id || !ALLOWED_DEVICES.includes(device_id)) {
            return NextResponse.json(
                { error: 'Unauthorized device', status: 'UNAUTHORIZED' },
                { status: 403 }
            );
        }

        // --- Validate employee_id ---
        if (!employee_id || String(employee_id).trim() === '') {
            return NextResponse.json(
                { error: 'Employee ID is required', status: 'INVALID_SCAN' },
                { status: 400 }
            );
        }

        const cleanEmpId = String(employee_id).trim();

        // --- Lookup employee by employee_id field (printed on QR) ---
        const empRes = await query(
            `SELECT id, employee_id, first_name, last_name, middle_name, 
                    department, position, employment_status, profile_picture, branch
             FROM employees 
             WHERE employee_id = $1`,
            [cleanEmpId]
        );

        if (empRes.rowCount === 0) {
            return NextResponse.json(
                { error: 'Employee not found', status: 'NOT_FOUND' },
                { status: 404 }
            );
        }

        const employee = empRes.rows[0];

        // --- Reject inactive employees ---
        const inactiveStatuses = ['Terminated', 'Resigned', 'Inactive'];
        if (inactiveStatuses.includes(employee.employment_status)) {
            return NextResponse.json(
                { error: 'Employee is no longer active', status: 'INACTIVE' },
                { status: 403 }
            );
        }

        // --- Current date & time ---
        const now = new Date();
        // Use local Philippine time (UTC+8) for date/time display
        const phOffset = 8 * 60; // minutes
        const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
        const phTime = new Date(utcMs + phOffset * 60000);

        const currentDate = phTime.toISOString().split('T')[0]; // yyyy-MM-dd
        const currentTime = phTime.toTimeString().split(' ')[0]; // HH:mm:ss
        const currentTimestamp = phTime.toISOString();

        // --- Check for existing attendance record today ---
        const attendanceRes = await query(
            `SELECT * FROM attendance WHERE employee_id = $1 AND date = $2`,
            [employee.id, currentDate]
        );

        const existing = attendanceRes.rows[0];

        let responseStatus: string;
        let recordedTime: string = currentTime;

        if (!existing) {
            // -- No record today: Record TIME IN --
            await query(
                `INSERT INTO attendance 
                    (employee_id, date, time_in, status, device_type, created_at)
                 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
                [employee.id, currentDate, currentTime, 'Present', device_id]
            );

            // Also set morning_in for 4-checkpoint compatibility
            await query(
                `UPDATE attendance 
                 SET morning_in = $1, morning_in_device = $2, morning_in_method = $3, updated_at = CURRENT_TIMESTAMP
                 WHERE employee_id = $4 AND date = $5`,
                [currentTime, device_id, 'QR Scan', employee.id, currentDate]
            ).catch(() => {}); // Non-critical

            responseStatus = 'TIME IN RECORDED';

        } else if (!existing.time_out) {
            // -- Record exists, no time_out yet: Record TIME OUT --

            // Prevent recording time_out if less than 1 min from time_in
            if (existing.time_in) {
                const inMs = new Date(`${currentDate}T${existing.time_in}`).getTime();
                const nowMs = phTime.getTime();
                if (nowMs - inMs < 60000) {
                    return NextResponse.json(
                        { error: 'Please wait at least 1 minute before timing out', status: 'TOO_SOON' },
                        { status: 429 }
                    );
                }
            }

            // Calculate total hours
            let totalHours = 0;
            if (existing.time_in) {
                const [h, m, s] = existing.time_in.split(':').map(Number);
                const inMs = new Date(currentDate).setHours(h, m, s || 0);
                const [oh, om, os] = currentTime.split(':').map(Number);
                const outMs = new Date(currentDate).setHours(oh, om, os || 0);
                totalHours = Math.round(((outMs - inMs) / (1000 * 60 * 60)) * 100) / 100;
            }

            await query(
                `UPDATE attendance 
                 SET time_out = $1, total_hours = $2, device_type = $3, updated_at = CURRENT_TIMESTAMP
                 WHERE employee_id = $4 AND date = $5`,
                [currentTime, totalHours, device_id, employee.id, currentDate]
            );

            // Also update afternoon_out for 4-checkpoint compat
            await query(
                `UPDATE attendance 
                 SET afternoon_out = $1, afternoon_out_device = $2, afternoon_out_method = $3, updated_at = CURRENT_TIMESTAMP
                 WHERE employee_id = $4 AND date = $5`,
                [currentTime, device_id, 'QR Scan', employee.id, currentDate]
            ).catch(() => {}); // Non-critical

            responseStatus = 'TIME OUT RECORDED';

        } else {
            // -- Both time_in and time_out already recorded --
            responseStatus = 'ALREADY COMPLETED';
        }

        // --- Audit Log (non-critical) ---
        const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
        try {
            await query(
                `INSERT INTO audit_logs (hr_user, employee_id, action, details, previous_credits, new_credits)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    `Device:${device_id}`,
                    employee.id,
                    'KIOSK_ATTENDANCE',
                    JSON.stringify({ status: responseStatus, time: currentTime, date: currentDate, device: device_id, ip: clientIp }),
                    0,
                    0
                ]
            );
        } catch (auditErr) {
            console.warn('Audit log insert failed:', auditErr);
        }

        // --- Return response ---
        return NextResponse.json({
            success: true,
            status: responseStatus,
            timestamp: currentTimestamp,
            time: currentTime,
            date: currentDate,
            employee: {
                id: employee.employee_id,
                name: `${employee.first_name} ${employee.middle_name ? employee.middle_name + ' ' : ''}${employee.last_name}`,
                first_name: employee.first_name,
                last_name: employee.last_name,
                department: employee.department || '',
                position: employee.position || '',
                profile_picture: employee.profile_picture || null,
                branch: employee.branch || ''
            }
        });

    } catch (error: any) {
        console.error('Attendance Scan API Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', status: 'SERVER_ERROR', message: error.message },
            { status: 500 }
        );
    }
}

// Optional: GET health check
export async function GET() {
    return NextResponse.json({
        service: 'Attendance Scan API',
        status: 'operational',
        timestamp: new Date().toISOString()
    });
}
