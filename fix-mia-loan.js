const fs = require('fs');
const dbPath = 'data/database.json';
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Find Mia
const mia = db.employees.find(e => e.first_name.toLowerCase().includes('mia'));
if (!mia) {
    console.log("Could not find Mia.");
    process.exit(1);
}

// Find her loan
let updated = false;
for (let loan of db.employee_loans) {
    if (loan.employee_id === mia.id && loan.balance === 31300) {
        loan.balance = 17500;
        updated = true;
        console.log("Updated Mia's loan balance from 31300 to 17500.");
    }
}

if (mia.salary_info && mia.salary_info.deductions) {
   mia.salary_info.deductions.company_loan_balance = 17500;
   console.log("Synced Mia's compensation tab balance to 17500 as well.");
   updated = true;
}

if (updated) {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log("database.json saved successfully.");
} else {
    console.log("No updates were necessary.");
}
