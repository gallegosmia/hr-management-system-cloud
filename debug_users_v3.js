const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'database.json');

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

console.log('--- USERS ---');
db.users.forEach(u => {
    console.log(`ID: ${u.id}, User: ${u.username}, Role: ${u.role}, Branch: ${u.assigned_branch}`);
});
