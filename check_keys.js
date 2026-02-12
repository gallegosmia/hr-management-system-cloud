const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'database.json');

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const user = db.users.find(u => u.username === 'superadmin');
console.log('Keys:', Object.keys(user).join(', '));
if (user.full_name) {
    console.log('full_name:', user.full_name);
}
