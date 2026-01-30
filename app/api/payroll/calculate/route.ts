import { NextRequest, NextResponse } from 'next/server';
import { getAllEmployees } from '@/lib/data';
import { calculateEmployeePayroll } from '@/lib/payroll-calculations';
import { validateBranchRequest } from '@/lib/middleware/branch-auth';
import { isSuperAdmin, filterByBranch } from '@/lib/branch-access';

export async function POST(request: NextRequest) {
    try {
        // Validate session and get user/branch context
        const validation = await validateBranchRequest(request);
        if (!validation.valid) {
            // If strictly needed, we could block here. But for calculation simulations,
            // we might be lenient or just default to limited view.
            // For security, let's enforce it but fallback gracefully if needed?
            // Actually, if session is invalid, we probably shouldn't return sensitive payroll data.
            // Let's rely on the middleware's result.
            if (validation.errorCode === 401) {
                return NextResponse.json({ error: validation.error }, { status: 401 });
            }
        }

        const { user, selectedBranch: headerBranch } = validation;
        const body = await request.json();
        const { startDate, endDate, selectedDeductions, branch: bodyBranch } = body;

        // Determine effective branch:
        // 1. If user is restricted (HR/Manager), FORCE their assigned branch.
        // 2. If user is SuperAdmin, allow them to select 'All' or specific branch.
        let effectiveBranch = bodyBranch;

        if (user && !isSuperAdmin(user.role)) {
            // Force the user's assigned branch
            effectiveBranch = user.assigned_branch;
        }

        const end = new Date(endDate);
        const day = end.getDate();

        const is15th = day >= 10 && day <= 15;
        const isEnd = day >= 25 || day <= 5;

        // Get all employees
        let employees = await getAllEmployees();

        // Apply strict branch filtering
        // We use filterByBranch helper which handles normalization (e.g. "Naval Branch" vs "Naval")
        employees = filterByBranch(employees, user?.role || 'Guest', effectiveBranch);

        // Standard payroll calculation for the filtered list
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
