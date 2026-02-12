const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'database.json');

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const user = db.users.find(u => u.username === 'superadmin');

console.log('Current Superadmin Employee ID:', user.employee_id);

if (user.employee_id) {
    console.log('Unlinking...');
    user.employee_id = null;
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log('Unlinked successfully.');
} else {
    console.log('Already unlinked.');
}
