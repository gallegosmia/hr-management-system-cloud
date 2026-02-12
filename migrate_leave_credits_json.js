
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
        if (db.employees) {
            console.log(`Updating ${db.employees.length} employees...`);
            db.employees = db.employees.map(emp => ({
                ...emp,
                leave_credits: emp.leave_credits !== undefined ? emp.leave_credits : 5.0
            }));
            fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
            console.log('Success!');
        } else {
            console.log('No employees table found in database.json');
        }
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

migrate();
