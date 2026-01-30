
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.json');
const dbContent = fs.readFileSync(dbPath, 'utf8');
const db = JSON.parse(dbContent);

console.log('--- All Employee IDs ---');
db.employees.forEach(emp => {
    console.log(`ID: ${emp.id} (${typeof emp.id}), EmpID: ${emp.employee_id}, Name: ${emp.first_name} ${emp.last_name}`);
});
