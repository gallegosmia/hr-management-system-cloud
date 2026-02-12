const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'database.json');

try {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    console.log('--- USERS ---');
    if (db.users) {
        db.users.forEach(u => {
            console.log(`ID: ${u.id}, User: ${u.username}, Role: ${u.role}, Branch: ${u.assigned_branch}`);
        });
    }

    console.log('\n--- PAYROLL RUNS ---');
    if (db.payroll_runs) {
        db.payroll_runs.forEach(r => {
            console.log(`ID: ${r.id}, Branch: ${r.branch}, Status: ${r.status}`);
        });
    }

} catch (e) {
    console.error(e);
}
