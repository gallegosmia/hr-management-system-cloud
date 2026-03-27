const fs = require('fs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'database.json');
const backupPath = path.join(process.cwd(), 'data', 'database.json.bak2');

try {
    fs.copyFileSync(dbPath, backupPath);
    console.log('Backed up database.json');

    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    if (data.payroll_runs && data.payroll_runs.length > 0) {
        console.log(`Deleting payroll run ID: ${data.payroll_runs[0].id}`);
        data.payroll_runs = [];
        data.payslips = [];
        data.payroll_audit_log = [];

        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        console.log('Successfully cleared all payroll runs, payslips, and logs.');
    } else {
        console.log('No payroll runs left to delete.');
    }
} catch (e) {
    console.error('Error:', e.message);
}
