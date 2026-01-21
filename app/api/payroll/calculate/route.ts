import { NextRequest, NextResponse } from 'next/server';
import { getAllEmployees } from '@/lib/data';
import { calculateEmployeePayroll } from '@/lib/payroll-calculations';

export async function POST(request: NextRequest) {
    try {
        const { startDate, endDate, selectedDeductions, branch } = await request.json();
        const end = new Date(endDate);
        const day = end.getDate();

        const is15th = day >= 10 && day <= 15;
        const isEnd = day >= 25 || day <= 5;

        let employees = await getAllEmployees();

        if (branch && branch !== 'All') {
            employees = employees.filter((emp: any) => emp.branch === branch);
        }

        const preview = employees.map((emp: any) => {
            return calculateEmployeePayroll({
                employee: emp,
                startDate,
                endDate,
                selectedDeductions,
                is15th,
                isEnd
            });
        }).filter(Boolean);

        return NextResponse.json(preview);
    } catch (error) {
        console.error('Payroll calculation error:', error);
        return NextResponse.json(
            { error: 'Failed to calculate payroll' },
            { status: 500 }
        );
    }
}
