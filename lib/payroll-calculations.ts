/**
 * Payroll Calculations Library
 * Pure pay-based computation (NO attendance dependency)
 * Date: February 9, 2026
 */

export interface PayrollInput {
    dailyRate?: number;  // PRIMARY: Daily rate (preferred)
    monthlySalary?: number;  // LEGACY: For backwards compatibility
    payrollDays: number;
    allowances?: {
        regular?: number;
        special?: number;
        holiday?: number;
        other?: number;
    };
    deductions?: {
        // 15th cutoff only
        phic?: number;
        pagibig?: number;
        pagibigLoan?: number;
        companyFunds?: number;
        // 30th cutoff only
        sss?: number;
        sssLoan?: number;
        // Both cutoffs
        companyLoan?: number;
        cashAdvance?: number;
        other?: number;
    };
}

export interface PayrollOutput {
    dailyRate: number;
    basicPay: number;
    grossPay: number;
    totalDeductions: number;
    netPay: number;
    breakdown: {
        earnings: {
            basicPay: number;
            regularAllowance: number;
            specialAllowance: number;
            holidayPay: number;
            otherEarnings: number;
        };
        deductions: {
            [key: string]: number;
        };
    };
}

/**
 * Compute payslip based on salary and payroll days
 * NEW LOGIC (Preferred):
 *   Daily Rate is provided directly
 *   Monthly Salary = Daily Rate × 30
 *   Basic Pay = Daily Rate × Payroll Days
 * 
 * LEGACY LOGIC (Backwards compatibility):
 *   If dailyRate not provided, use monthlySalary
 *   Daily Rate = Monthly Salary / 30
 *   Basic Pay = Daily Rate × Payroll Days
 * 
 * Formula:
 *   Gross Pay = Basic Pay + All Allowances
 *   Net Pay = Gross Pay - Total Deductions
 */
export function computePayslip(
    input: PayrollInput,
    cutoffDay: 15 | 30 | 31
): PayrollOutput {
    // Step 1: Determine daily rate
    // PRIORITY: Use dailyRate if provided, otherwise calculate from monthlySalary
    let dailyRate: number;
    if (input.dailyRate !== undefined && input.dailyRate > 0) {
        // NEW LOGIC: Daily rate is primary
        dailyRate = roundToTwo(input.dailyRate);
    } else if (input.monthlySalary !== undefined && input.monthlySalary > 0) {
        // LEGACY LOGIC: Calculate from monthly salary
        dailyRate = roundToTwo(input.monthlySalary / 30);
    } else {
        // Fallback: No salary information provided
        dailyRate = 0;
    }

    // Step 2: Calculate basic pay
    const basicPay = roundToTwo(dailyRate * input.payrollDays);

    // Step 3: Calculate total allowances
    const allowances = input.allowances || {};
    const totalAllowances =
        (allowances.regular || 0) +
        (allowances.special || 0) +
        (allowances.holiday || 0) +
        (allowances.other || 0);

    // Step 4: Calculate gross pay
    const grossPay = roundToTwo(basicPay + totalAllowances);

    // Step 5: Calculate total deductions (filtered by cutoff)
    const totalDeductions = getApplicableDeductions(
        input.deductions || {},
        cutoffDay
    );

    // Step 6: Calculate net pay
    const netPay = roundToTwo(grossPay - totalDeductions);

    // Return detailed breakdown
    return {
        dailyRate,
        basicPay,
        grossPay,
        totalDeductions,
        netPay,
        breakdown: {
            earnings: {
                basicPay,
                regularAllowance: allowances.regular || 0,
                specialAllowance: allowances.special || 0,
                holidayPay: allowances.holiday || 0,
                otherEarnings: allowances.other || 0
            },
            deductions: getDeductionsBreakdown(input.deductions || {}, cutoffDay)
        }
    };
}

/**
 * Get applicable deductions based on cutoff day
 * 15th: PHIC, Pag-IBIG, Pag-IBIG Loan, Company Funds, Company Loan, Cash Advance, Other
 * 30th/31st: SSS, SSS Loan, Pag-IBIG Loan, Company Loan, Cash Advance, Other
 */
function getApplicableDeductions(
    deductions: NonNullable<PayrollInput['deductions']>,
    cutoffDay: 15 | 30 | 31
): number {
    if (cutoffDay === 15) {
        return roundToTwo(
            (deductions.phic || 0) +
            (deductions.pagibig || 0) +
            (deductions.pagibigLoan || 0) +
            (deductions.companyFunds || 0) +
            (deductions.companyLoan || 0) +
            (deductions.cashAdvance || 0) +
            (deductions.other || 0)
        );
    } else {
        return roundToTwo(
            (deductions.sss || 0) +
            (deductions.sssLoan || 0) +
            (deductions.pagibigLoan || 0) +
            (deductions.companyLoan || 0) +
            (deductions.cashAdvance || 0) +
            (deductions.other || 0)
        );
    }
}

/**
 * Get deductions breakdown (only applicable ones)
 */
function getDeductionsBreakdown(
    deductions: NonNullable<PayrollInput['deductions']>,
    cutoffDay: 15 | 30 | 31
): { [key: string]: number } {
    const breakdown: { [key: string]: number } = {};

    if (cutoffDay === 15) {
        // 15th cutoff deductions
        if (deductions.phic) breakdown.phic = deductions.phic;
        if (deductions.pagibig) breakdown.pagibig = deductions.pagibig;
        if (deductions.pagibigLoan) breakdown.pagibigLoan = deductions.pagibigLoan;
        if (deductions.companyFunds) breakdown.companyFunds = deductions.companyFunds;
    } else {
        // 30th/31st cutoff deductions
        if (deductions.sss) breakdown.sss = deductions.sss;
        if (deductions.sssLoan) breakdown.sssLoan = deductions.sssLoan;
        if (deductions.pagibigLoan) breakdown.pagibigLoan = deductions.pagibigLoan;
    }

    // Both cutoffs
    if (deductions.companyLoan) breakdown.companyLoan = deductions.companyLoan;
    if (deductions.cashAdvance) breakdown.cashAdvance = deductions.cashAdvance;
    if (deductions.other) breakdown.other = deductions.other;

    return breakdown;
}

/**
 * Validate payroll days against period
 */
export function validatePayrollDays(
    payrollDays: number,
    periodStart: Date,
    periodEnd: Date
): { valid: boolean; error?: string } {
    // Calculate actual days in period
    const diffTime = Math.abs(periodEnd.getTime() - periodStart.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Relaxed validation: Allow up to 31 days regardless of period length to accommodate fixed semi-monthly rates (15/15)
    if (payrollDays > 31) {
        return {
            valid: false,
            error: `Payroll days (${payrollDays}) cannot exceed 31 days`
        };
    }

    if (payrollDays <= 0) {
        return {
            valid: false,
            error: 'Payroll days must be greater than 0'
        };
    }

    return { valid: true };
}

/**
 * Generate payroll run number
 * Format: BRANCH-YYYYMM-CUTOFF-SEQ
 * Example: ORMOC-202602-15-001
 */
export function generateRunNumber(
    branch: string,
    periodStart: Date,
    cutoffDay: number,
    sequence: number
): string {
    const year = periodStart.getFullYear();
    const month = String(periodStart.getMonth() + 1).padStart(2, '0');
    const seq = String(sequence).padStart(3, '0');

    return `${branch.toUpperCase()}-${year}${month}-${cutoffDay}-${seq}`;
}

/**
 * Get deduction columns for cutoff
 */
export function getDeductionColumns(cutoffDay: 15 | 30 | 31): string[] {
    if (cutoffDay === 15) {
        return [
            'phic',
            'pagibig',
            'pagibigLoan',
            'companyFunds',
            'companyLoan',
            'cashAdvance',
            'other'
        ];
    } else {
        return [
            'sss',
            'sssLoan',
            'pagibigLoan',
            'companyLoan',
            'cashAdvance',
            'other'
        ];
    }
}

/**
 * Get deduction display names
 */
export function getDeductionDisplayName(key: string): string {
    const names: { [key: string]: string } = {
        phic: 'PhilHealth (PHIC)',
        pagibig: 'Pag-IBIG',
        pagibigLoan: 'Pag-IBIG Loan',
        companyFunds: 'Company Funds',
        sss: 'SSS',
        sssLoan: 'SSS Loan',
        companyLoan: 'Company Loan',
        cashAdvance: 'Cash Advance',
        other: 'Other Deductions'
    };

    return names[key] || key;
}

/**
 * Batch compute payslips for multiple employees
 */
export function batchComputePayslips(
    employees: Array<{
        id: number;
        monthlySalary: number;
        payrollDays: number;
        allowances?: PayrollInput['allowances'];
        deductions?: PayrollInput['deductions'];
    }>,
    cutoffDay: 15 | 30 | 31
): Array<PayrollOutput & { employeeId: number }> {
    return employees.map(emp => ({
        employeeId: emp.id,
        ...computePayslip(
            {
                monthlySalary: emp.monthlySalary,
                payrollDays: emp.payrollDays,
                allowances: emp.allowances,
                deductions: emp.deductions
            },
            cutoffDay
        )
    }));
}

/**
 * Helper: Round to 2 decimal places
 */
function roundToTwo(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: any): string {
    const num = parseFloat(amount);
    const safe = isNaN(num) ? 0 : num;
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(safe);
}

/**
 * Format currency without symbol
 */
export function formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string): number {
    return parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0;
}
