import { NextRequest, NextResponse } from 'next/server';
import { getAll } from '@/lib/database';

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
        const empLeaves = (leaves || []).filter((l: any) => l.employee_id === id && l.status === 'Approved');
        const totalPaidLeavesUsed = empLeaves.reduce((sum: number, l: any) => sum + (l.days_count || 0), 0);
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
