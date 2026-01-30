const fs = require('fs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'database.json');

if (fs.existsSync(dbPath)) {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    console.log('\n=== USERS ===');
    if (db.users) {
        db.users.forEach(u => {
            console.log(`${u.username} (${u.role}) - assigned_branch: ${u.assigned_branch || 'NOT SET'} - active: ${u.is_active}`);
        });
    }

    console.log('\n=== CURRENT SESSIONS ===');
    if (db.sessions) {
        db.sessions.forEach(s => {
            const user = db.users.find(u => u.id === s.user_id);
            console.log(`Session ${s.id.substring(0, 8)}... - User: ${user ? user.username : 'unknown'} - selected_branch: ${s.selected_branch || 'NOT SET'}`);
        });
    }

    console.log('\n=== EMPLOYEES BY BRANCH ===');
    const branchCounts = {};
    if (db.employees) {
        db.employees.forEach(emp => {
            const branch = emp.branch || 'No Branch';
            branchCounts[branch] = (branchCounts[branch] || 0) + 1;
        });
        Object.keys(branchCounts).forEach(branch => {
            console.log(`${branch}: ${branchCounts[branch]} employees`);
        });
    }
} else {
    console.log('Database file not found at:', dbPath);
}
