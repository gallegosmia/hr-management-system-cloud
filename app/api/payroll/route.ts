import { NextRequest, NextResponse } from 'next/server';
import { createPayrollRun, createPayslip, getAllPayrollRuns, getEmployeeById, updateEmployee, batchCreatePayslips, batchUpdateEmployees, getAllEmployees } from '@/lib/data';

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
        const totalAmount = items.reduce((sum: number, i: any) => sum + (typeof i.net_pay === 'string' ? parseFloat(i.net_pay) : (i.net_pay || 0)), 0);
        const runId = await createPayrollRun({
            period_start,
            period_end,
            total_amount: totalAmount,
            status: status || 'Finalized',
            created_by: 1
        });

        const isFinalized = (status || 'Finalized') === 'Finalized';
        const payslipsToCreate = [];
        const employeeUpdates = [];

        // Fetch all employees in one go if finalized
        const allEmployees = isFinalized ? await getAllEmployees() : [];
        const employeeMap = new Map(allEmployees.map(e => [e.id, e]));

        for (const item of items) {
            payslipsToCreate.push({
                payroll_run_id: runId,
                employee_id: item.employee_id,
                gross_pay: typeof item.gross_pay === 'string' ? parseFloat(item.gross_pay) : (item.gross_pay || 0),
                net_pay: typeof item.net_pay === 'string' ? parseFloat(item.net_pay) : (item.net_pay || 0),
                total_deductions: typeof item.deductions === 'string' ? parseFloat(item.deductions) : (item.deductions || 0),
                total_allowances: typeof item.allowances === 'string' ? parseFloat(item.allowances) : (item.allowances || 0),
                days_present: typeof item.days_present === 'string' ? parseFloat(item.days_present) : (item.days_present || 0),
                double_pay_days: typeof item.double_pay_days === 'string' ? parseFloat(item.double_pay_days) : (item.double_pay_days || 0),
                double_pay_amount: typeof item.double_pay_amount === 'string' ? parseFloat(item.double_pay_amount) : (item.double_pay_amount || 0),
                deduction_details: item.deduction_details || {},
                allowance_details: { standard: typeof item.allowances === 'string' ? parseFloat(item.allowances) : (item.allowances || 0) }
            });

            if (isFinalized) {
                const emp = employeeMap.get(item.employee_id);
                if (emp && emp.salary_info && emp.salary_info.deductions) {
                    const d = emp.salary_info.deductions;
                    const updates: any = { salary_info: JSON.parse(JSON.stringify(emp.salary_info)) };
                    let hasUpdates = false;

                    if (item.deduction_details && item.deduction_details.company_loan && d.company_loan) {
                        const deduction = typeof item.deduction_details.company_loan === 'string' ? parseFloat(item.deduction_details.company_loan) : (item.deduction_details.company_loan || 0);
                        const balance = typeof d.company_loan.balance === 'string' ? parseFloat(d.company_loan.balance) : (d.company_loan.balance || 0);
                        updates.salary_info.deductions.company_loan.balance = Math.max(0, balance - deduction);
                        hasUpdates = true;
                    }

                    if (hasUpdates) {
                        employeeUpdates.push({ id: emp.id, data: updates });
                    }
                }
            }
        }

        // Perform bulk operations
        await batchCreatePayslips(payslipsToCreate);
        if (employeeUpdates.length > 0) {
            await batchUpdateEmployees(employeeUpdates);
        }

        return NextResponse.json({ success: true, id: runId });
    } catch (error) {
        console.error('Save payroll error:', error);
        return NextResponse.json({ error: 'Failed to save payroll' }, { status: 500 });
    }
}
