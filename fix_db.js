const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.json');

try {
    const rawData = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(rawData);

    // 1. Remove the Ghost Loan (ID 19)
    const initialLoanCount = db.employee_loans.length;
    db.employee_loans = db.employee_loans.filter(loan => loan.id !== 19);
    const finalLoanCount = db.employee_loans.length;

    if (initialLoanCount === finalLoanCount) {
        console.log('Loan ID 19 not found, continuing with employee updates...');
    } else {
        console.log(`Removed loan ID 19. Count: ${initialLoanCount} -> ${finalLoanCount}`);
    }

    // 2. Update Employee 'ARRADAZA, JOSEPHINE' (ID 1)
    const employee = db.employees.find(e => e.id === 1);
    if (employee) {
        console.log(`Found employee: ${employee.last_name}, ${employee.first_name}`);

        // Update Balances
        employee.loan_balance = 0;
        employee.ledger_balance = 0;

        // Update Salary Info Deductions
        if (employee.salary_info && employee.salary_info.deductions) {
            // Check if company_loan is an object or number
            if (typeof employee.salary_info.deductions.company_loan === 'object') {
                employee.salary_info.deductions.company_loan.balance = 0;
                employee.salary_info.deductions.company_loan.amortization = 0;
            } else {
                employee.salary_info.deductions.company_loan = 0;
            }

            employee.salary_info.deductions.company_loan_balance = 0;
            console.log('Updated employee balances and salary info.');
        }
    } else {
        console.log('Employee ID 1 not found!');
    }

    // Save
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log('Database updated successfully.');

} catch (error) {
    console.error('Error updating database:', error);
}
