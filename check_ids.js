
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.json');
const dbContent = fs.readFileSync(dbPath, 'utf8');
const db = JSON.parse(dbContent);

console.log('--- Employee IDs ---');
db.employees.slice(0, 10).forEach(emp => {
    console.log(`ID: ${emp.id} (type: ${typeof emp.id}), EmployeeID: ${emp.employee_id}, Name: ${emp.first_name} ${emp.last_name}`);
});
