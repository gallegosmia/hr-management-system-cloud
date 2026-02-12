
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

        // 1. Create employee_loans table if not exists
        if (!db.employee_loans) {
            console.log('Creating employee_loans table...');
            db.employee_loans = [];
        }

        // 2. Add loan_config to settings if not exists
        if (db.settings) {
            const hasLoanConfig = db.settings.some(s => s.key === 'loan_config');
            if (!hasLoanConfig) {
                console.log('Adding loan_config to settings...');
                db.settings.push({
                    id: db.settings.length + 1,
                    key: 'loan_config',
                    value: {
                        max_total_company_loan: 30000,
                        last_updated: new Date().toISOString()
                    },
                    description: 'Global company-wide loan exposure limit',
                    updated_at: new Date().toISOString()
                });
            }
        }

        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        console.log('Migration Success!');
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

migrate();
