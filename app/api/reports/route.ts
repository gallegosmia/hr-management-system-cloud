import { NextResponse } from 'next/server';
import { getAll } from '@/lib/database';
import { getDashboardStats, getDetailedReportsData } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const start = searchParams.get('start') || undefined;
        const end = searchParams.get('end') || undefined;

        const dateRange = start && end ? { start, end } : undefined;

        const stats = await getDashboardStats();
        const detailedReports = await getDetailedReportsData(dateRange);
        const employees = await getAll('employees');
        const leaves = await getAll('leave_requests');

        // Legacy compatibility + Enhanced data
        return NextResponse.json({
            overview: stats,
            ...detailedReports,
            department_compliance: detailedReports.headcount.byDepartment.map((dept: { name: string, count: number }) => {
                const audit = detailedReports.complianceAudit.filter(a => a.department === dept.name);
                const complete = audit.filter(a => a.status === 'Complete').length;
                return {
                    department: dept.name,
                    total: dept.count,
                    complete,
                    rate: dept.count > 0 ? Math.round((complete / dept.count) * 100) : 0
                };
            }),
            leave_utilization: leaves.reduce((acc: any, curr: any) => {
                acc[curr.leave_type] = (acc[curr.leave_type] || 0) + (Number(curr.days_count) || 0);
                return acc;
            }, {}),
            leave_details: leaves.map((l: any) => {
                const emp = employees.find((e: any) => e.id === l.employee_id);
                return {
                    ...l,
                    employee_name: emp ? `${emp.last_name}, ${emp.first_name}` : 'Unknown',
                    department: emp ? emp.department : 'Unknown'
                };
            }),
            attendance_metrics: {
                present: detailedReports.attendanceSummary.reduce((a, b) => a + b.present, 0),
                late: detailedReports.attendanceSummary.reduce((a, b) => a + b.late, 0),
                absent: detailedReports.attendanceSummary.reduce((a, b) => a + b.absent, 0)
            }
        });
    } catch (error) {
        console.error('Reports API error:', error);
        return NextResponse.json(
            { error: 'Failed to generate reports' },
            { status: 500 }
        );
    }
}
