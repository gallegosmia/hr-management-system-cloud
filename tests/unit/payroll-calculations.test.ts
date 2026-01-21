import { calculateEmployeePayroll } from '@/lib/payroll-calculations';
import { mockEmployees } from '../mocks/data';

describe('Payroll Calculations with Real Data', () => {
    const josephinesData = mockEmployees[0]; // JOSEPHINE ARRADAZA
    const eddiesData = mockEmployees[2];     // EDDIE JR. CABALLES

    it('should calculate Josephine\'s payroll correctly for the 15th', () => {
        const result = calculateEmployeePayroll({
            employee: josephinesData,
            startDate: '2024-03-01',
            endDate: '2024-03-15',
            is15th: true,
            isEnd: false
        });

        expect(result).not.toBeNull();
        if (result) {
            // Josephine: Basic 13710 / 2 = 6855
            expect(result.gross_pay).toBe(6855);

            // Special Allowance 1500 / 2 = 750
            expect(result.allowances).toBe(750);

            // 15th Deductions: Philhealth(285), Pagibig(200), Company Cash Fund(300), SSS Loan(1292.06), Pagibig Loan(1783.16)
            expect(result.deduction_details.philhealth).toBe(285);
            expect(result.deduction_details.pagibig).toBe(200);
            expect(result.deduction_details.company_cash_fund).toBe(300);
            expect(result.deduction_details.sss_loan).toBe(1292.06);
            expect(result.deduction_details.pagibig_loan).toBe(1783.16);

            const expectedDeductions = 285 + 200 + 300 + 1292.06 + 1783.16;
            expect(result.deductions).toBeCloseTo(expectedDeductions, 2);
            expect(result.net_pay).toBeCloseTo(6855 + 750 - expectedDeductions, 2);
        }
    });

    it('should calculate Eddie\'s payroll correctly for the end of month', () => {
        const result = calculateEmployeePayroll({
            employee: eddiesData,
            startDate: '2024-03-16',
            endDate: '2024-03-31',
            is15th: false,
            isEnd: true
        });

        expect(result).not.toBeNull();
        if (result) {
            // Eddie: Basic 13560 / 2 = 6780
            expect(result.gross_pay).toBe(6780);

            // End of month: SSS(675), Company Loan(2000), SSS Loan(1199.77), Pagibig Loan(1773.3)
            // Note: Current logic includes sss_loan and pagibig_loan if amortization > 0, regardless of balance
            expect(result.deduction_details.sss).toBe(675);
            expect(result.deduction_details.company_loan).toBe(2000);
            expect(result.deduction_details.sss_loan).toBe(1199.77);
            expect(result.deduction_details.pagibig_loan).toBe(1773.3);

            const expectedDeductions = 675 + 2000 + 1199.77 + 1773.3;
            expect(result.deductions).toBeCloseTo(expectedDeductions, 2);
            expect(result.net_pay).toBeCloseTo(6780 + 500 - expectedDeductions, 2);
        }
    });

    it('should respect selectedDeductions for Josephine', () => {
        const result = calculateEmployeePayroll({
            employee: josephinesData,
            startDate: '2024-03-01',
            endDate: '2024-03-15',
            is15th: true,
            isEnd: false,
            selectedDeductions: ['sss'] // Force SSS regardless of date
        });

        expect(result).not.toBeNull();
        if (result) {
            expect(result.deduction_details.sss).toBe(725);
            expect(result.deduction_details.philhealth).toBeUndefined();
            expect(result.deduction_details.pagibig).toBeUndefined();
        }
    });
});
