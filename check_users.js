
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.json');
const dbContent = fs.readFileSync(dbPath, 'utf8');
const db = JSON.parse(dbContent);

console.log('--- Users ---');
db.users.forEach(u => {
    console.log(`Username: ${u.username}, Role: ${u.role}, Branch: ${u.assigned_branch}`);
});
