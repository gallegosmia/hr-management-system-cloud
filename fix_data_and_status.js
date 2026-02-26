const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.json');

try {
    const rawData = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(rawData);

    // 1. Reset Payroll Run 1 status to 'Under Review - Operations Manager'
    // This allows the Operations Manager to 'Return to HR' or 'Approve' it again.
    const run = db.payroll_runs.find(r => r.id === 1);
    if (run) {
        console.log(`Resetting run ${run.run_number} status from '${run.status}' to 'Under Review - Operations Manager'`);
        run.status = 'Under Review - Operations Manager';
        run.current_reviewer_role = 'Operations Manager';
    } else {
        console.warn('Payroll Run 1 not found');
    }

    // 2. Fix Payslip for Arradaza (Employee 1)
    const payslip = db.payslips.find(p => p.employee_id === 1 && p.payroll_run_id === 1);
    if (payslip) {
        console.log('Fixing payslip for Arradaza...');

        // Remove company loan deduction
        const loanAmount = payslip.company_loan || 0;

        if (loanAmount > 0) {
            payslip.company_loan = 0;
            // Also zero out balance references if any
            if (payslip.deductions && payslip.deductions.company_loan) {
                if (typeof payslip.deductions.company_loan === 'object') {
                    payslip.deductions.company_loan.balance = 0;
                    payslip.deductions.company_loan.amortization = 0;
                } else {
                    payslip.deductions.company_loan = 0;
                }
            }
            payslip.company_loan_balance = 0;

            // Recalculate totals
            // Deductions: PHIC(285) + PagIBIG(200) + Company Funds(300) = 785
            const newTotalDeductions = (payslip.total_deductions || 0) - loanAmount;
            payslip.total_deductions = newTotalDeductions;

            // Net Pay
            payslip.net_pay = (payslip.gross_pay || 0) - newTotalDeductions;

            console.log(`Updated Payslip: Deductions ${newTotalDeductions}, Net Pay ${payslip.net_pay}`);
        } else {
            console.log('Company loan was already 0.');
        }

    } else {
        console.warn('Payslip for Arradaza not found in Run 1');
    }

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log('Database updated successfully.');

} catch (error) {
    console.error('Error updating database:', error);
}
