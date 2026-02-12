const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'database.json');

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

console.log(`Total Users: ${db.users.length}`);
const superAdmin = db.users.find(u => u.username === 'superadmin');
if (superAdmin) {
    console.log('Superadmin found:', JSON.stringify(superAdmin, null, 2));
} else {
    console.log('Superadmin NOT found.');
}
