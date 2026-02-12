const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'database.json');

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const emp1 = db.employees.find(e => e.id === 1);
if (emp1) {
    console.log(`Employee 1 Name: ${emp1.first_name} ${emp1.last_name}`);
} else {
    console.log('Employee 1 NOT FOUND');
}
