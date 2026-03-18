const fs = require('fs');

try {
    const db = JSON.parse(fs.readFileSync('./data/database.json', 'utf8'));
    const emp = db.employees.find(e => e.last_name.toLowerCase().includes('caballes'));
    if (emp) {
        let salary_info = emp.salary_info;
        if (typeof salary_info === 'string') salary_info = JSON.parse(salary_info);

        if (salary_info && salary_info.deductions) {
            console.log("Before:", salary_info.deductions.pagibig_loan_30th);
            salary_info.deductions.pagibig_loan_30th = 0;
            console.log("After:", salary_info.deductions.pagibig_loan_30th);
        }

        emp.salary_info = JSON.stringify(salary_info);
        fs.writeFileSync('./data/database.json', JSON.stringify(db, null, 2));
        console.log("Updated Eddie Caballes in JSON successfully!");
    } else {
        console.log("Caballes not found");
    }
} catch (e) {
    console.error(e);
}
