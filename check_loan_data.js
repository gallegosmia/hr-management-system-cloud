const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data/database.json', 'utf8'));
const loans = db.gov_contribution_details.filter(d => Number(d.loan_deduction) > 0);
console.log('Total loans in details:', loans.length);
if (loans.length > 0) console.log(loans[0]);

const empsWithPbLoan = db.employees.filter(e => {
    if (!e.salary_info) return false;
    let s = typeof e.salary_info === 'string' ? JSON.parse(e.salary_info) : e.salary_info;
    if (!s.deductions) return false;
    return Number(s.deductions.pagibig_loan_15th) > 0 || Number(s.deductions.pagibig_loan_30th) > 0 || Number(s.deductions.pagibig_loan) > 0;
});
console.log('Employees with pagibig loan in salary_info:', empsWithPbLoan.length);
if (empsWithPbLoan.length > 0) {
    let emp = empsWithPbLoan[0];
    let s = typeof emp.salary_info === 'string' ? JSON.parse(emp.salary_info) : emp.salary_info;
    console.log('Emp:', emp.first_name, emp.last_name, 'Loan:', s.deductions.pagibig_loan_15th, s.deductions.pagibig_loan_30th, s.deductions.pagibig_loan);
}
