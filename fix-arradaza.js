
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'database.json');

function main() {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

    // 1. Update Employee Record
    const empIndex = data.employees.findIndex(e => e.last_name.toUpperCase().includes('ARRADAZA'));
    if (empIndex >= 0) {
        const emp = data.employees[empIndex];
        let sInfo = typeof emp.salary_info === 'string' ? JSON.parse(emp.salary_info) : emp.salary_info;

        // Remove Pag-IBIG Loan
        if (sInfo.deductions && sInfo.deductions.pagibig_loan) {
            sInfo.deductions.pagibig_loan = { balance: 0, amortization: 0 };
        }

        // Ensure Special Allowance is set (it was 250, keep it)
        if (!sInfo.allowances) sInfo.allowances = {};
        sInfo.allowances.special = 250;

        emp.salary_info = JSON.stringify(sInfo); // Save back as string or object depending on DB consistency? 
        // usage in route.ts suggests string parsing is handled. Let's start with object if that's what was there, but typically it's stringified in some places?
        // actually existing data had it as object in my debug output.
        // Wait, debug output showed: "Current Salary Info: { ... }" which means it was an object in memory after parsing.
        // Let's check raw file? The parsing logic `typeof s === 'string'` implies it *can* be string.
        // I will save it as object to be safe if the file supports it, or string if that's the convention.
        // Let's safeJson it.
        emp.salary_info = sInfo;

        console.log('Updated Employee Record for Arradaza');
    }

    // 2. Update Payslip Record
    // Find payroll run ORMOC-202602-15-006
    // Actually simpler to find payslip by employee_id and run_number link
    const run = data.payroll_runs.find(r => r.run_number === 'ORMOC-202602-15-006');
    if (run) {
        const payslip = data.payslips.find(p => p.payroll_run_id === run.id && p.employee_id === data.employees[empIndex].id);
        if (payslip) {
            console.log('Found Payslip:', payslip.id);

            // Update Values
            payslip.pagibig_loan = 0;
            payslip.special_allowance = 250;

            // Recalculate
            const basic = payslip.basic_pay || 0;
            const reg = payslip.regular_allowance || 0;
            const special = payslip.special_allowance || 0;
            const holiday = payslip.holiday_pay || 0;

            payslip.gross_pay = basic + reg + special + holiday;

            // Sum deductions
            const dedFields = ['phic', 'pagibig', 'pagibig_loan', 'company_funds', 'sss', 'sss_loan', 'company_loan', 'cash_advance', 'other_deductions'];
            let totalDed = 0;
            dedFields.forEach(f => {
                totalDed += (payslip[f] || 0);
            });

            payslip.total_deductions = totalDed;
            payslip.net_pay = payslip.gross_pay - totalDed;

            console.log('Updated Payslip:', {
                gross: payslip.gross_pay,
                totalDed: payslip.total_deductions,
                net: payslip.net_pay
            });
        } else {
            console.log('Payslip not found for this run');
        }
    } else {
        console.log('Run ORMOC-202602-15-006 not found');
    }

    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    console.log('Database saved');
}

main();
