export interface PayrollInput {
    employee: any;
    startDate: string;
    endDate: string;
    selectedDeductions?: string[];
    is15th: boolean;
    isEnd: boolean;
}

export function calculateEmployeePayroll(input: PayrollInput) {
    const { employee, selectedDeductions, is15th, isEnd } = input;

    if (!employee.salary_info) return null;
    if (['Resigned', 'Terminated'].includes(employee.employment_status)) return null;

    const grossPay = employee.salary_info.basic_salary / 2;

    let totalAllowances = 0;
    if (employee.salary_info.allowances) {
        if (employee.salary_info.allowances.special !== undefined) {
            totalAllowances = employee.salary_info.allowances.special;
        } else {
            totalAllowances = Object.values(employee.salary_info.allowances as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
        }
    }
    const allowances = totalAllowances / 2;

    let totalDeductions = 0;
    const deductionDetails: any = {};
    const d = employee.salary_info.deductions;

    const shouldInclude = (id: string) => {
        if (selectedDeductions && Array.isArray(selectedDeductions)) {
            return selectedDeductions.includes(id);
        }
        if (['sss_loan', 'pagibig_loan', 'company_loan', 'cash_advance', 'other_deductions'].includes(id)) {
            return true;
        }
        if (is15th) {
            return ['philhealth', 'pagibig', 'company_cash_fund'].includes(id);
        }
        if (isEnd) {
            return ['sss'].includes(id);
        }
        return false;
    };

    if (shouldInclude('pagibig') && d.pagibig_contribution) {
        totalDeductions += d.pagibig_contribution;
        deductionDetails.pagibig = d.pagibig_contribution;
    }

    if (shouldInclude('company_cash_fund') && d.company_cash_fund) {
        totalDeductions += d.company_cash_fund;
        deductionDetails.company_cash_fund = d.company_cash_fund;
    }

    if (shouldInclude('philhealth') && d.philhealth_contribution) {
        totalDeductions += d.philhealth_contribution;
        deductionDetails.philhealth = d.philhealth_contribution;
    }

    if (shouldInclude('sss') && d.sss_contribution) {
        totalDeductions += d.sss_contribution;
        deductionDetails.sss = d.sss_contribution;
    }

    if (shouldInclude('sss_loan') && d.sss_loan && d.sss_loan.amortization > 0) {
        const amount = d.sss_loan.amortization;
        totalDeductions += amount;
        deductionDetails.sss_loan = amount;
    }

    if (shouldInclude('company_loan') && d.company_loan && d.company_loan.balance > 0) {
        const amount = Math.min(d.company_loan.balance, d.company_loan.amortization);
        totalDeductions += amount;
        deductionDetails.company_loan = amount;
    }

    if (shouldInclude('cash_advance') && d.cash_advance) {
        let amount = 0;
        if (typeof d.cash_advance === 'number') {
            amount = d.cash_advance;
        } else if (d.cash_advance.balance > 0) {
            amount = Math.min(d.cash_advance.balance, d.cash_advance.amortization || d.cash_advance.balance);
        }

        if (amount > 0) {
            totalDeductions += amount;
            deductionDetails.cash_advance = amount;
        }
    }

    if (shouldInclude('pagibig_loan') && d.pagibig_loan && d.pagibig_loan.amortization > 0) {
        const amount = d.pagibig_loan.amortization;
        totalDeductions += amount;
        deductionDetails.pagibig_loan = amount;
    }

    if (shouldInclude('other_deductions') && d.other_deductions && d.other_deductions.length > 0) {
        d.other_deductions.forEach((od: any) => {
            if (od.amount > 0) {
                totalDeductions += od.amount;
                deductionDetails[od.name || 'Other Deduction'] = od.amount;
            }
        });
    }

    const safeGross = isNaN(grossPay) ? 0 : grossPay;
    const safeAllowances = isNaN(allowances) ? 0 : allowances;
    const safeDeductions = isNaN(totalDeductions) ? 0 : totalDeductions;

    const netPay = safeGross + safeAllowances - safeDeductions;

    return {
        employee_id: employee.id,
        employee_name: `${employee.last_name}, ${employee.first_name}`,
        department: employee.department,
        position: employee.position,
        branch: employee.branch || 'N/A',
        gross_pay: grossPay,
        allowances: allowances,
        deductions: totalDeductions,
        deduction_details: deductionDetails,
        net_pay: netPay,
        daily_rate: employee.salary_info.daily_rate
    };
}
