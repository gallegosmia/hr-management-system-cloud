import { NextRequest, NextResponse } from 'next/server';
import { getEmployeeByEmployeeId, recordAttendance, getAttendanceByDate } from '@/lib/data';
import { format } from 'date-fns';

export async function POST(request: NextRequest) {
    try {
        const { scanData } = await request.json();

        if (!scanData) {
            return NextResponse.json({ error: 'No scan data provided' }, { status: 400 });
        }

        // Find employee
        const employee = await getEmployeeByEmployeeId(scanData);
        if (!employee) {
            return NextResponse.json({ error: `Employee not found: ${scanData}` }, { status: 404 });
        }

        const today = format(new Date(), 'yyyy-MM-dd');
        const currentTime = format(new Date(), 'HH:mm');

        // Get today's attendance for everyone and find this employee's record
        const attendance = await getAttendanceByDate(today);
        const existingRecord = attendance.find(a => a.employee_id === employee.id);

        let action = '';
        const record: any = {
            employee_id: employee.id,
            date: today,
            remarks: existingRecord?.remarks || ''
        };

        if (!existingRecord || !existingRecord.time_in) {
            // Clock In
            action = 'IN';
            record.time_in = currentTime;
            record.time_out = existingRecord?.time_out || null;

            // Auto-detect late status
            const cutoff = new Date(`2000-01-01 08:00`);
            const scanTime = new Date(`2000-01-01 ${currentTime}`);
            record.status = scanTime > cutoff ? 'Late' : 'Present';
        } else if (!existingRecord.time_out) {
            // Clock Out
            action = 'OUT';
            record.time_in = existingRecord.time_in;
            record.time_out = currentTime;
            record.status = existingRecord.status; // Keep status from Clock In
        } else {
            return NextResponse.json({
                error: 'Already clocked out for today',
                employeeName: `${employee.first_name} ${employee.last_name}`,
                timeIn: existingRecord.time_in,
                timeOut: existingRecord.time_out
            }, { status: 400 });
        }

        await recordAttendance(record);

        return NextResponse.json({
            success: true,
            action,
            employeeName: `${employee.first_name} ${employee.last_name}`,
            time: currentTime,
            status: record.status
        });

    } catch (error) {
        console.error('Scan attendance error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
