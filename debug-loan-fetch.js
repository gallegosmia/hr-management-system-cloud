
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

function loadDB() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Failed to parse database.json', e);
        return {};
    }
}

function getById(db, table, id) {
    const list = db[table] || [];
    return list.find(item => String(item.id) === String(id));
}

function run() {
    console.log('Loading DB...');
    const db = loadDB();
    console.log('DB keys:', Object.keys(db));

    // Check emergency_loans
    const table = 'emergency_loans';
    const loanId = 4;
    console.log(`Checking ${table} for ID ${loanId}...`);

    if (!db[table]) {
        console.error(`Table ${table} missing!`);
    } else {
        console.log(`${table} count:`, db[table].length);
    }

    const loan = getById(db, table, loanId);
    console.log('Loan found:', loan ? 'YES' : 'NO');

    if (loan) {
        console.log('Loan details:', JSON.stringify(loan, null, 2));

        const empId = loan.employee_id;
        console.log(`Fetching employee ${empId}...`);

        const emp = getById(db, 'employees', empId);
        console.log('Employee found:', emp ? 'YES' : 'NO');

        if (emp) {
            console.log('Employee name:', `${emp.first_name} ${emp.last_name}`);
        } else {
            console.log('Employee name would be "Unknown"');
        }

        const result = {
            ...loan,
            employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
            position: emp?.position,
            branch: emp?.branch,
            department: emp?.department,
            salary_info: emp?.salary_info
        };
        console.log('Constructed Result:', JSON.stringify(result, null, 2));
    }
}

run();
