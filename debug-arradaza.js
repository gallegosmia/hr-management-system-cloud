
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'database.json');

function main() {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    const emp = data.employees.find(e => e.last_name.toUpperCase().includes('ARRADAZA'));

    if (!emp) {
        console.log('Employee not found');
        return;
    }

    console.log('Found Employee:', emp.first_name, emp.last_name);
    let sInfo = emp.salary_info;
    if (typeof sInfo === 'string') {
        try {
            sInfo = JSON.parse(sInfo);
        } catch (e) {
            console.log('Error parsing salary_info');
        }
    }

    console.log('Current Salary Info:', JSON.stringify(sInfo, null, 2));
}

main();
