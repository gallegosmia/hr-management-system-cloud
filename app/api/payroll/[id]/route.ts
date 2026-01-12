import { NextRequest, NextResponse } from 'next/server';
import { getPayrollRunById, getPayslipsByRunId, getEmployeeById, deletePayrollRun, updatePayrollRun, createPayslip, updateEmployee } from '@/lib/data';
import { remove } from '@/lib/database';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);
        const run = await getPayrollRunById(id);

        if (!run) {
            return (NextResponse as any).json({ error: 'Payroll run not found' }, { status: 404 });
        }

        const payslips = await getPayslipsByRunId(id);

        const enrichedPayslips = await Promise.all(payslips.map(async (p) => {
            const emp = await getEmployeeById(p.employee_id);
            return {
                ...p,
                employee_name: emp ? `${emp.last_name}, ${emp.first_name}` : 'Unknown Employee',
                position: emp?.position || 'N/A',
                daily_rate: emp?.salary_info?.daily_rate || 0
            };
        }));

        return (NextResponse as any).json({
            ...run,
            payslips: enrichedPayslips
        });
    } catch (error) {
        console.error('Get payroll run details error:', error);
        return (NextResponse as any).json({ error: 'Failed to fetch payroll run details' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);
        await deletePayrollRun(id);
        return (NextResponse as any).json({ success: true });
    } catch (error) {
        console.error('Delete payroll run error:', error);
        return (NextResponse as any).json({ error: 'Failed to delete payroll run' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);
        const body = await (request as any).json();
        const { period_start, period_end, items, status } = body;

        const previousRun = await getPayrollRunById(id);
        if (!previousRun) {
            return (NextResponse as any).json({ error: 'Payroll run not found' }, { status: 404 });
        }

        const updates: any = { ...body };
        if (items) {
            updates.total_amount = items.reduce((sum: number, i: any) => sum + i.net_pay, 0);
            delete updates.items;
        }
        await updatePayrollRun(id, updates);

        if (items && items.length > 0) {
            const existingPayslips = await getPayslipsByRunId(id);
            for (const p of existingPayslips) {
                await remove('payslips', p.id);
            }

            for (const item of items) {
                await createPayslip({
                    payroll_run_id: id,
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
            }
        }

        if (status === 'Finalized' && previousRun.status !== 'Finalized') {
            const payslips = items || await getPayslipsByRunId(id);
            for (const item of payslips) {
                const emp = await getEmployeeById(item.employee_id);
                if (emp && emp.salary_info && emp.salary_info.deductions) {
                    const d = emp.salary_info.deductions;
                    const empUpdates: any = { salary_info: JSON.parse(JSON.stringify(emp.salary_info)) };
                    let hasUpdates = false;

                    const deductionDetails = item.deduction_details || {};

                    if (deductionDetails.company_loan && d.company_loan) {
                        empUpdates.salary_info.deductions.company_loan.balance = Math.max(0, d.company_loan.balance - deductionDetails.company_loan);
                        hasUpdates = true;
                    }

                    if (deductionDetails.sss_loan && d.sss_loan) {
                        empUpdates.salary_info.deductions.sss_loan.balance = Math.max(0, d.sss_loan.balance - deductionDetails.sss_loan);
                        hasUpdates = true;
                    }

                    if (deductionDetails.pagibig_loan && d.pagibig_loan) {
                        empUpdates.salary_info.deductions.pagibig_loan.balance = Math.max(0, d.pagibig_loan.balance - deductionDetails.pagibig_loan);
                        hasUpdates = true;
                    }

                    if (hasUpdates) {
                        await updateEmployee(emp.id, empUpdates);
                    }
                }
            }
        }

        return (NextResponse as any).json({ success: true });
    } catch (error) {
        console.error('Update payroll error:', error);
        return (NextResponse as any).json({ error: 'Failed to update payroll' }, { status: 500 });
    }
}
