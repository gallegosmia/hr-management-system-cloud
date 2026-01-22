import { NextRequest, NextResponse } from 'next/server';
import { getAll } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');
        const start = searchParams.get('start');
        const end = searchParams.get('end');

        if (!employeeId || !start || !end) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const id = parseInt(employeeId);
        const attendance = await getAll('attendance') as any[];
        const leaves = await getAll('leave_requests') as any[];

        const startDate = new Date(start);
        const endDate = new Date(end);

        // Filter logs using robust string comparison
        const logs = attendance
            .filter((r: any) => {
                let dStr = r.date;
                // Normalize to YYYY-MM-DD string
                if (r.date instanceof Date) {
                    dStr = r.date.toISOString().split('T')[0];
                } else if (typeof r.date === 'string') {
                    dStr = r.date.split('T')[0];
                }
                return r.employee_id === id && dStr >= start && dStr <= end;
            })
            .sort((a: any, b: any) => {
                const da = a.date instanceof Date ? a.date.toISOString() : a.date;
                const db = b.date instanceof Date ? b.date.toISOString() : b.date;
                return da.localeCompare(db);
            });

        // Calculate Leave Dates
        const leaveDates = new Set<string>();
        const approvedLeaves = (leaves || []).filter((l: any) => l.employee_id === id && l.status === 'Approved');

        approvedLeaves.forEach((leave: any) => {
            try {
                const lStart = new Date(leave.start_date.split('T')[0]);
                const lEnd = new Date((leave.end_date || leave.start_date).split('T')[0]);

                let current = new Date(lStart);
                while (current <= lEnd) {
                    const dStr = current.toISOString().split('T')[0];
                    // Only count if within the requested report range
                    if (dStr >= start && dStr <= end) {
                        leaveDates.add(dStr);
                    }
                    current.setDate(current.getDate() + 1);
                }
            } catch (e) {
                console.error('Error parsing leave dates:', e);
            }
        });

        // Also add dates from Attendance marked as 'On Leave' (if not already added)
        logs.filter((r: any) => r.status === 'On Leave').forEach((log: any) => {
            let dStr = log.date;
            if (log.date instanceof Date) dStr = log.date.toISOString().split('T')[0];
            else if (typeof log.date === 'string') dStr = log.date.split('T')[0];

            if (dStr >= start && dStr <= end) {
                leaveDates.add(dStr);
            }
        });

        const summary = {
            present: logs.filter((r: any) => r.status === 'Present').length,
            late: logs.filter((r: any) => r.status === 'Late').length,
            absent: logs.filter((r: any) => r.status === 'Absent').length,
            onLeave: leaveDates.size, // Total unique leave days in period
            paidLeavesUsed: leaveDates.size,
            totalPaidLeavesUsed: leaveDates.size,
            present_on_leave: logs.filter((r: any) => r.status === 'On Leave').length,
            remainingPaidLeaves: Math.max(0, 5 - leaveDates.size)
        };

        return NextResponse.json({
            summary,
            logs
        });

    } catch (error) {
        console.error('Individual report API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
