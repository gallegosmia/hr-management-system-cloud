
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

async function migrate() {
    if (!fs.existsSync(DB_FILE)) {
        console.error('database.json not found');
        return;
    }

    try {
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

        if (!db.employee_loans) db.employee_loans = [];

        // For each employee, check their salary_info for existing balances
        db.employees.forEach(emp => {
            const deductions = emp.salary_info?.deductions;
            if (!deductions) return;

            const existingLoans = db.employee_loans.filter(l => l.employee_id === emp.id);

            // 1. Check Company Loan
            const companyLoanBalance = Number(deductions.company_loan?.balance || 0);
            if (companyLoanBalance > 0) {
                // Check if already in ledger (simple check by type)
                const alreadyInLedger = existingLoans.some(l => l.loan_type === 'Company Loan' || l.loan_type.includes('Existing Company Loan'));
                if (!alreadyInLedger) {
                    db.employee_loans.push({
                        id: db.employee_loans.length + 1,
                        employee_id: emp.id,
                        loan_type: 'Existing Company Loan',
                        principal: companyLoanBalance,
                        balance: companyLoanBalance,
                        status: 'Active',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                    console.log(`Added Company Loan for ${emp.first_name} ${emp.last_name}: ₱${companyLoanBalance}`);
                }
            }

            // 2. Check Cash Advance
            const cashAdvanceBalance = Number(deductions.cash_advance || 0);
            if (cashAdvanceBalance > 0) {
                const alreadyInLedger = existingLoans.some(l => l.loan_type === 'Cash Advance');
                if (!alreadyInLedger) {
                    db.employee_loans.push({
                        id: db.employee_loans.length + 1,
                        employee_id: emp.id,
                        loan_type: 'Cash Advance',
                        principal: cashAdvanceBalance,
                        balance: cashAdvanceBalance,
                        status: 'Active',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                    console.log(`Added Cash Advance for ${emp.first_name} ${emp.last_name}: ₱${cashAdvanceBalance}`);
                }
            }

            // Note: SSS/Pag-IBIG usually go to govt, but if they are included in "compensation & benefit loan programs" 
            // the user might want them. For now, following "company loan" literally.
            // If the user meant all loans in the deduction tile, we can add them later.
        });

        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        console.log('Sync complete!');
    } catch (error) {
        console.error('Sync failed:', error);
    }
}

migrate();
