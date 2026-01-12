import { NextRequest, NextResponse } from 'next/server';
import { createPayrollRun, createPayslip, getAllPayrollRuns, getEmployeeById, updateEmployee } from '@/lib/data';

export async function GET() {
    try {
        const runs = await getAllPayrollRuns();

        if (runs && runs.length > 0) {
            runs.sort((a, b) => {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return dateB - dateA;
            });
        }

        return NextResponse.json(runs || []);
    } catch (error) {
        console.error('Get payroll runs error:', error);
        return NextResponse.json({ error: 'Failed to fetch payroll runs' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { period_start, period_end, items, status } = await request.json();

        // Create Run
        const runId = await createPayrollRun({
            period_start,
            period_end,
            total_amount: items.reduce((sum: number, i: any) => sum + i.net_pay, 0),
            status: status || 'Finalized',
            created_by: 1
        });

        const isFinalized = (status || 'Finalized') === 'Finalized';

        for (const item of items) {
            await createPayslip({
                payroll_run_id: runId,
                employee_id: item.employee_id,
                gross_pay: item.gross_pay,
                net_pay: item.net_pay,
                total_deductions: item.deductions,
                total_allowances: item.allowances,
                days_present: item.days_present || 0,
                double_pay_days: item.double_pay_days || 0,
                double_pay_amount: item.double_pay_amount || 0,
                deduction_details: item.deduction_details,
                allowance_details: { standard: item.allowances }
            });

            if (isFinalized) {
                const emp = await getEmployeeById(item.employee_id);
                if (emp && emp.salary_info && emp.salary_info.deductions) {
                    const d = emp.salary_info.deductions;
                    const updates: any = { salary_info: JSON.parse(JSON.stringify(emp.salary_info)) };
                    let hasUpdates = false;

                    if (item.deduction_details.company_loan && d.company_loan) {
                        updates.salary_info.deductions.company_loan.balance = Math.max(0, d.company_loan.balance - item.deduction_details.company_loan);
                        hasUpdates = true;
                    }

                    if (item.deduction_details.sss_loan && d.sss_loan) {
                        updates.salary_info.deductions.sss_loan.balance = Math.max(0, d.sss_loan.balance - item.deduction_details.sss_loan);
                        hasUpdates = true;
                    }

                    if (item.deduction_details.pagibig_loan && d.pagibig_loan) {
                        updates.salary_info.deductions.pagibig_loan.balance = Math.max(0, d.pagibig_loan.balance - item.deduction_details.pagibig_loan);
                        hasUpdates = true;
                    }

                    if (hasUpdates) {
                        await updateEmployee(emp.id, updates);
                    }
                }
            }
        }

        return NextResponse.json({ success: true, id: runId });
    } catch (error) {
        console.error('Save payroll error:', error);
        return NextResponse.json({ error: 'Failed to save payroll' }, { status: 500 });
    }
}
