
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

async function migrate() {
    if (!fs.existsSync(DB_FILE)) {
        console.error('database.json not found');
        return;
    }

    try {
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

        // 1. Add loan_balance to employees if not exists
        if (db.employees) {
            console.log(`Updating ${db.employees.length} employees with loan_balance...`);
            db.employees = db.employees.map(emp => ({
                ...emp,
                loan_balance: emp.loan_balance !== undefined ? emp.loan_balance : 0.0
            }));
        }

        // 2. Create emergency_loans table if not exists
        if (!db.emergency_loans) {
            console.log('Creating emergency_loans table...');
            db.emergency_loans = [];
        }

        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        console.log('Migration Success!');
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

migrate();
