const { query } = require('../lib/database');
require('dotenv').config();

async function main() {
    try {
        console.log("Searching for Victorio Reloba Jr...");
        // Search by last name or first name to be safe
        const result = await query(`
            SELECT id, first_name, last_name, deductions_info 
            FROM employees 
            WHERE last_name ILIKE $1 AND first_name ILIKE $2
        `, ['%Reloba%', '%Victorio%']);

        // Handle result.rows or result depending on query implementation
        const rows = (result as any).rows || result;

        if (!rows || rows.length === 0) {
            console.log("Employee not found.");
            // List all employees just in case
            const all = await query('SELECT id, first_name, last_name FROM employees ORDER BY last_name LIMIT 10', []);
            console.log("First 10 employees:", (all as any).rows || all);
            return;
        }

        const emp = rows[0];
        console.log(`Found Employee: ${emp.first_name} ${emp.last_name} (ID: ${emp.id})`);

        let deductionsInfo = emp.deductions_info;
        if (typeof deductionsInfo === 'string') {
            try {
                deductionsInfo = JSON.parse(deductionsInfo);
            } catch (e) {
                console.error("Failed to parse deductions_info JSON");
                return;
            }
        }

        console.log("Current Deductions Info:", JSON.stringify(deductionsInfo, null, 2));

        // Check if sss_loan is set and fix it
        let modified = false;

        // Strategy: 
        // 1. Move sss_loan value to pagibig_loan_30th if sss_loan > 0 

        let sssLoanVal = 0;
        // Handle potential nested object
        if (deductionsInfo.sss_loan && typeof deductionsInfo.sss_loan === 'object') {
            sssLoanVal = parseFloat((deductionsInfo.sss_loan as any).amortization || '0');
        } else {
            sssLoanVal = parseFloat((deductionsInfo.sss_loan as any) || '0');
        }

        const pbLoanVal = parseFloat((deductionsInfo.pagibig_loan_30th as any) || '0');

        if (sssLoanVal > 0) {
            console.log(`\nFound SSS Loan: ${sssLoanVal}. Moving to Pag-IBIG Loan (30th)...`);

            // Set Pag-IBIG Loan 30th
            deductionsInfo.pagibig_loan_30th = sssLoanVal;

            // Clear SSS Loan
            if (typeof deductionsInfo.sss_loan === 'object') {
                (deductionsInfo.sss_loan as any).amortization = 0;
            } else {
                deductionsInfo.sss_loan = 0;
            }

            // Also ensure pagibig_loan is 0 if it's the 1st cutoff field to avoid confusion
            if (deductionsInfo.pagibig_loan) {
                // deductionsInfo.pagibig_loan = 0; // Or keep it if valid? User said "It is NOT SSS Loan", implying the SSS entry is wrong.
            }

            modified = true;
        } else {
            console.log("\nNo SSS Loan value found to move.");
            if (pbLoanVal > 0) {
                console.log(`Pag-IBIG Loan 30th is already set to ${pbLoanVal}.`);
            }
        }

        if (modified) {
            console.log("\nUpdating database...");
            await query(`
                UPDATE employees 
                SET deductions_info = $1 
                WHERE id = $2
            `, [JSON.stringify(deductionsInfo), emp.id]);
            console.log("Update successful!");
            console.log("New Deductions Info:", JSON.stringify(deductionsInfo, null, 2));
        } else {
            console.log("\nNo changes made.");
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

main();
