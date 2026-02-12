const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'database.json');

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Find user with username 'superadmin' and fix employee_id
const users = db.users || [];
const user = users.find(u => u.username === 'superadmin');

if (user) {
    if (user.employee_id) {
        console.log(`Original superadmin linked to emp ID: ${user.employee_id}`);
        // Remove employee_id from superadmin to fix name association
        user.employee_id = null;
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        console.log('Superadmin unlinked from employee ID.');
    } else {
        console.log('Superadmin already unlinked.');
    }
} else {
    console.log('User not found.');
}
