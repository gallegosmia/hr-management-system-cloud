const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.json');

try {
    if (!fs.existsSync(dbPath)) {
        console.log('Database file not found!');
        process.exit(1);
    }

    const content = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(content);

    const run = db.payroll_runs.find(r => r.id === 4);

    if (run) {
        console.log('Payroll Run Found:');
        console.log(JSON.stringify(run, null, 2));

        // Check if payslips exist for this run
        const slips = db.payslips.filter(p => p.payroll_run_id === 4);
        console.log(`Payslips count: ${slips.length}`);
        if (slips.length > 0) {
            console.log('Sample Payslip:', JSON.stringify(slips[0], null, 2));
        }

        // Check referential integrity
        slips.forEach(s => {
            const emp = db.employees.find(e => e.id === s.employee_id);
            if (!emp) console.log(`Warning: Employee ID ${s.employee_id} not found for payslip ${s.id}`);
        });

    } else {
        console.log('Payroll Run with ID 4 NOT FOUND.');
    }

} catch (err) {
    console.error('Error reading database:', err);
}
