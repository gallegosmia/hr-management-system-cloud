const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data/database.json', 'utf8'));

const mia = db.employees.find(e => e.first_name.toLowerCase().includes('mia'));
if (!mia) {
    console.log("Could not find Mia.");
    process.exit(1);
}

console.log("Mia's ID:", mia.id);
console.log("Mia's salary_info loan balance:", mia.salary_info?.deductions?.company_loan_balance);

const loans = db.employee_loans.filter(l => l.employee_id === mia.id);
console.log("Mia's employee_loans:");
console.dir(loans, { depth: null });
