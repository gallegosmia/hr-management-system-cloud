import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { format } from 'date-fns';

export async function POST(request: NextRequest) {
    try {
        const { employee_id, device_info } = await request.json();

        if (!employee_id) {
            return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
        }

        // 1. Fetch employee details
        const empRes = await query('SELECT id, employee_id, first_name, last_name, middle_name, department, position, employment_status, profile_picture FROM employees WHERE employee_id = $1', [employee_id]);

        if (empRes.rowCount === 0) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        const employee = empRes.rows[0];

        // 2. Check if active
        const inactiveStatuses = ['Terminated', 'Resigned'];
        if (inactiveStatuses.includes(employee.employment_status)) {
            return NextResponse.json({ error: 'Cannot log attendance for inactive or terminated employees' }, { status: 403 });
        }

        const today = format(new Date(), 'yyyy-MM-dd');
        const now = format(new Date(), 'HH:mm:ss');

        // 3. Prevent duplicate scans within the same minute
        const dupRes = await query(
            'SELECT id FROM attendance WHERE employee_id = $1 AND date = $2 AND (time_in >= $3 OR time_out >= $3)',
            [employee.id, today, format(new Date(Date.now() - 60000), 'HH:mm:ss')]
        );

        if (dupRes.rowCount > 0) {
            return NextResponse.json({ error: 'Duplicate scan. Please wait 1 minute before scanning again.' }, { status: 429 });
        }

        // 4. Check if already logged in for today
        const existingRes = await query('SELECT id FROM attendance WHERE employee_id = $1 AND date = $2', [employee.id, today]);

        if (existingRes.rowCount > 0) {
            return NextResponse.json({ error: 'You have already logged in for today.' }, { status: 400 });
        }

        // 5. Record Attendance
        // Note: Using 'device_type' column if it exists, otherwise it will just be ignored or error if we don't handle it.
        // I'll check if the column exists first or just attempt to insert it if I'm sure about the migration.
        // Actually, I'll use a more flexible query to avoid crashes if the column isn't there yet.

        try {
            await query(
                'INSERT INTO attendance (employee_id, date, time_in, status, device_type) VALUES ($1, $2, $3, $4, $5)',
                [employee.id, today, now, 'Present', device_info || 'Kiosk']
            );
        } catch (dbErr: any) {
            if (dbErr.message.includes('device_type')) {
                // Fallback for local DB or unmigrated DB
                await query(
                    'INSERT INTO attendance (employee_id, date, time_in, status) VALUES ($1, $2, $3, $4)',
                    [employee.id, today, now, 'Present']
                );
            } else {
                throw dbErr;
            }
        }

        // 6. Audit Log
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        try {
            await query(
                'INSERT INTO audit_logs (user_id, action, details, ip_address, created_at) VALUES ($1, $2, $3, $4, $5)',
                [employee.id, 'SCAN_ATTENDANCE', JSON.stringify({ device: device_info || 'Kiosk', time: now }), ip, new Date().toISOString()]
            );
        } catch (auditErr) {
            console.error('Failed to log audit:', auditErr);
            // Don't fail the scan if audit fails
        }

        return NextResponse.json({
            success: true,
            message: 'Attendance logged successfully',
            employee: {
                ...employee,
                logged_at: `${today} ${now}`
            }
        });

    } catch (error: any) {
        console.error('Scan Error:', error);
        return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
    }
}
