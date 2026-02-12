import { NextRequest, NextResponse } from 'next/server';
import { getEmployeeLoanBalance, getLoanConfig, getEmployeeById } from '@/lib/data';
import { validateBranchRequest } from '@/lib/middleware/branch-auth';

export async function GET(request: NextRequest) {
    try {
        const validation = await validateBranchRequest(request);
        if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employee_id');

        if (!employeeId) return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });

        const empId = parseInt(employeeId);
        const balance = await getEmployeeLoanBalance(empId);
        const config = await getLoanConfig();
        const employee = await getEmployeeById(empId);

        return NextResponse.json({
            current_balance: balance,
            max_limit: config.max_total_company_loan || 30000,
            remaining: Math.max(0, (config.max_total_company_loan || 30000) - balance),
            current_deduction: employee?.salary_info?.deductions?.company_loan?.amortization || 0
        });

    } catch (error) {
        console.error('Eligibility fetch error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
