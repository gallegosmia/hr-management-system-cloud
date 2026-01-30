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

    if (!employee.salary_info) {
        return {
            employee_id: employee.id,
            employee_name: `${employee.last_name}, ${employee.first_name}`,
            department: employee.department,
            position: employee.position,
            branch: employee.branch || 'N/A',
            gross_pay: 0,
            allowances: 0,
            deductions: 0,
            deduction_details: {},
            net_pay: 0,
            daily_rate: 0
        };
    }
    if (['Resigned', 'Terminated'].includes(employee.employment_status)) return null;

    const safeDailyRate = parseFloat(employee.salary_info.daily_rate) || 0;
    const grossPay = safeDailyRate * 15; // Semi-monthly standard (15 days)

    let totalAllowances = 0;
    if (employee.salary_info.allowances) {
        const allowancesObj = employee.salary_info.allowances;
        if (allowancesObj.special !== undefined) {
            totalAllowances = parseFloat(allowancesObj.special) || 0;
        } else {
            totalAllowances = Object.values(allowancesObj as Record<string, any>)
                .reduce((a: number, b: any) => a + (parseFloat(b) || 0), 0);
        }
    }
    const allowances = totalAllowances / 2;

    let totalDeductions = 0;
    const deductionDetails: any = {};
    const d = employee.salary_info.deductions || {};

    const shouldInclude = (id: string) => {
        if (selectedDeductions && Array.isArray(selectedDeductions)) {
            return selectedDeductions.includes(id);
        }
        if (['sss_loan', 'pagibig_loan', 'company_loan', 'cash_advance', 'other_deductions', 'philhealth', 'pagibig', 'sss', 'company_cash_fund'].includes(id)) {
            return true;
        }
        return false;
    };

    if (shouldInclude('pagibig') && d.pagibig_contribution) {
        const amount = parseFloat(d.pagibig_contribution) || 0;
        totalDeductions += amount;
        deductionDetails.pagibig = amount;
    }

    if (shouldInclude('company_cash_fund') && d.company_cash_fund) {
        const amount = parseFloat(d.company_cash_fund) || 0;
        totalDeductions += amount;
        deductionDetails.company_cash_fund = amount;
    }

    if (shouldInclude('philhealth') && d.philhealth_contribution) {
        const amount = parseFloat(d.philhealth_contribution) || 0;
        totalDeductions += amount;
        deductionDetails.philhealth = amount;
    }

    if (shouldInclude('sss') && d.sss_contribution) {
        const amount = parseFloat(d.sss_contribution) || 0;
        totalDeductions += amount;
        deductionDetails.sss = amount;
    }

    if (shouldInclude('sss_loan') && d.sss_loan) {
        const amortization = typeof d.sss_loan.amortization === 'string' ? parseFloat(d.sss_loan.amortization) : d.sss_loan.amortization;
        if (amortization > 0) {
            totalDeductions += amortization;
            deductionDetails.sss_loan = amortization;
            // Removed sss_loan_balance as requested
        }
    }

    if (shouldInclude('company_loan') && d.company_loan && d.company_loan.balance > 0) {
        const balance = typeof d.company_loan.balance === 'string' ? parseFloat(d.company_loan.balance) : d.company_loan.balance;
        const amortization = typeof d.company_loan.amortization === 'string' ? parseFloat(d.company_loan.amortization) : d.company_loan.amortization;
        if (amortization > 0) {
            const amount = Math.min(balance || 0, amortization);
            totalDeductions += amount;
            deductionDetails.company_loan = amount;
            deductionDetails.company_loan_balance = (balance || 0) - amount;
        }
    }

    if (shouldInclude('cash_advance') && d.cash_advance) {
        let amount = 0;
        if (typeof d.cash_advance === 'number') {
            amount = d.cash_advance;
        } else if (typeof d.cash_advance === 'string') {
            amount = parseFloat(d.cash_advance) || 0;
        } else if (d.cash_advance.balance > 0) {
            const balance = typeof d.cash_advance.balance === 'string' ? parseFloat(d.cash_advance.balance) : d.cash_advance.balance;
            const amortization = typeof d.cash_advance.amortization === 'string' ? parseFloat(d.cash_advance.amortization) : (d.cash_advance.amortization || balance);
            amount = Math.min(balance || 0, (typeof amortization === 'string' ? parseFloat(amortization) : amortization) || 0);
            deductionDetails.cash_advance_balance = (balance || 0) - amount;
        }

        if (amount > 0) {
            totalDeductions += amount;
            deductionDetails.cash_advance = amount;
        }
    }

    if (shouldInclude('pagibig_loan') && d.pagibig_loan) {
        const amortization = typeof d.pagibig_loan.amortization === 'string' ? parseFloat(d.pagibig_loan.amortization) : d.pagibig_loan.amortization;
        if (amortization > 0) {
            totalDeductions += amortization;
            deductionDetails.pagibig_loan = amortization;
            // Removed pagibig_loan_balance for consistency
        }
    }

    if (shouldInclude('other_deductions') && d.other_deductions && d.other_deductions.length > 0) {
        let otherTotal = 0;
        d.other_deductions.forEach((od: any) => {
            const amount = parseFloat(od.amount) || 0;
            if (amount > 0) {
                totalDeductions += amount;
                otherTotal += amount;
                deductionDetails[od.name || 'Other Deduction'] = amount;
            }
        });
        deductionDetails.other_deductions = otherTotal;
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
        gross_pay: safeGross,
        allowances: safeAllowances,
        deductions: safeDeductions,
        deduction_details: deductionDetails,
        net_pay: netPay,
        daily_rate: safeDailyRate
    };
}
