const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'database.json');

try {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    console.log('--- USERS ---');
    if (db.users) {
        db.users.forEach(u => {
            console.log(`User ID: ${u.id}, Username: ${u.username}, Role: ${u.role}, Branch: ${u.assigned_branch}`);
        });
    } else {
        console.log('No users found.');
    }

    console.log('\n--- PAYROLL RUNS ---');
    if (db.payroll_runs) {
        db.payroll_runs.forEach(r => {
            console.log(`Run ID: ${r.id}, Branch: ${r.branch}, Status: ${r.status}`);
        });
    } else {
        console.log('No payroll runs found.');
    }

} catch (e) {
    console.error('Error:', e.message);
}
