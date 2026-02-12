const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'database.json');

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const user = db.users.find(u => u.username === 'superadmin');
console.log(JSON.stringify(user));
