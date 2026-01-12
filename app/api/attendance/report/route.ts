import { NextRequest, NextResponse } from 'next/server';
import { getAll } from '@/lib/database';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const start = searchParams.get('start');
        const end = searchParams.get('end');

        if (!start || !end) {
            return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
        }

        const employees = await getAll('employees');
        const attendance = await getAll('attendance');
        const leaves = await getAll('leave_requests');

        const startDate = new Date(start);
        const endDate = new Date(end);

        // Filter attendance records within the range
        const filteredAttendance = attendance.filter((record: any) => {
            const recordDate = new Date(record.date);
            return recordDate >= startDate && recordDate <= endDate;
        });

        // Initialize summary
        const summary = {
            present: 0,
            late: 0,
            absent: 0,
            onLeave: 0
        };

        // Calculate per-employee stats
        const employeeStats = employees.map((emp: any) => {
            const empRecords = filteredAttendance.filter((r: any) => r.employee_id === emp.id);

            // Get all approved leaves for this employee
            const empLeaves = (leaves || []).filter((l: any) => l.employee_id === emp.id && l.status === 'Approved');
            const totalPaidLeavesUsed = empLeaves.reduce((sum: number, l: any) => sum + (Number(l.days_count) || 0), 0);
            const remainingPaidLeaves = Math.max(0, 5 - totalPaidLeavesUsed);

            const stats = {
                present: empRecords.filter((r: any) => r.status === 'Present').length,
                late: empRecords.filter((r: any) => r.status === 'Late').length,
                absent: empRecords.filter((r: any) => r.status === 'Absent').length,
                onLeave: empRecords.filter((r: any) => r.status === 'On Leave').length,
                paidLeavesUsed: totalPaidLeavesUsed,
                remainingPaidLeaves: remainingPaidLeaves
            };

            // Add to overall summary
            summary.present += stats.present;
            summary.late += stats.late;
            summary.absent += stats.absent;
            summary.onLeave += stats.onLeave;

            return {
                id: emp.id,
                name: `${emp.first_name} ${emp.last_name}`,
                department: emp.department,
                ...stats
            };
        });

        return NextResponse.json({
            summary,
            employees: employeeStats,
            config: {
                maxPaidLeaves: 5
            }
        });

    } catch (error) {
        console.error('Attendance report API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
