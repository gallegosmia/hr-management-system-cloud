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

        // Filter logs for this employee in the range
        const logs = attendance
            .filter((r: any) => r.employee_id === id && new Date(r.date) >= startDate && new Date(r.date) <= endDate)
            .sort((a: any, b: any) => a.date.localeCompare(b.date));

        // Calculate Paid Leave (5-day limit)
        // Calculate Paid Leave (5-day limit) based on BOTH Approved Requests AND Attendance 'On Leave'
        // Use a Set to store unique dates to avoid double counting if a request exists AND attendance is marked
        const leaveDates = new Set<string>();

        // 1. Add dates from Approved Leave Requests
        const approvedLeaves = (leaves || []).filter((l: any) => l.employee_id === id && l.status === 'Approved');
        approvedLeaves.forEach((leave: any) => {
            // If a leave spans multiple days, we should ideally expand it. 
            // For simplicity in this context, assuming single-day requests or we rely on start_date.
            // If your system supports multi-day leaves properly, you'd iterate from start_date to end_date.
            // Here we'll add the start_date as a basic counting mechanism, or better, if 'days_count' is used, just ensure we don't double count.
            // A safer approach: trust 'On Leave' attendance status as the source of truth for "Used" days, 
            // BUT if you want to include future approved leaves that haven't happened yet, we need those too.

            // Strategy: Add confirmed 'On Leave' dates from attendance. 
            // Then add Approved Leave dates that are NOT already in the attendance set (e.g. future leaves).
            if (leave.start_date) leaveDates.add(leave.start_date.split('T')[0]);
        });

        // 2. Add dates from Attendance marked as 'On Leave'
        logs.filter((r: any) => r.status === 'On Leave').forEach((log: any) => {
            if (log.date) leaveDates.add(log.date.split('T')[0]);
        });

        const totalPaidLeavesUsed = leaveDates.size;
        const remainingPaidLeaves = Math.max(0, 5 - totalPaidLeavesUsed);

        const summary = {
            present: logs.filter((r: any) => r.status === 'Present').length,
            late: logs.filter((r: any) => r.status === 'Late').length,
            absent: logs.filter((r: any) => r.status === 'Absent').length,
            onLeave: logs.filter((r: any) => r.status === 'On Leave').length,
            paidLeavesUsed: totalPaidLeavesUsed,
            remainingPaidLeaves: remainingPaidLeaves
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
