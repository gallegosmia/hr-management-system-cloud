
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

if (db.payslips) {
    console.log(`Found ${db.payslips.length} payslips.`);
    const withOther = db.payslips.filter(p => p.deductions && p.deductions.other_deductions && p.deductions.other_deductions.length > 0);
    console.log(`Found ${withOther.length} payslips with other_deductions.`);

    if (withOther.length > 0) {
        console.log('First 3 examples:');
        withOther.slice(0, 3).forEach(p => {
            console.log(JSON.stringify(p.deductions.other_deductions, null, 2));
        });
    }
} else {
    console.log('No payslips table found in database.json');
}
