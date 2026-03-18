const fs = require('fs');
const db = JSON.parse(fs.readFileSync('./data/database.json'));

const usernames = db.users.map(u => u.username);
const duplicates = usernames.filter((item, index) => usernames.indexOf(item) !== index);
console.log("Duplicate usernames:", [...new Set(duplicates)]);

const targetUser = db.users.find(u => u.username === 'superadmin');
console.log("superadmin user:", targetUser);
