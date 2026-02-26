const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const databaseJsonPath = path.join(process.cwd(), 'data', 'database.json');
const envPath = path.join(process.cwd(), '.env');

// Check for .env file
let url = null;
if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf-8');
    const match = env.match(/^DATABASE_URL=(.+)$/m);
    if (match) url = match[1].trim();
}

if (!url) {
    console.log('No DATABASE_URL found. Checking for local JSON DB...');
    if (fs.existsSync(databaseJsonPath)) {
        console.log('Local JSON DB found at:', databaseJsonPath);
        process.exit(0);
    } else {
        console.error('No database configuration found.');
        process.exit(1);
    }
}

// Check Postgres Connection
const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()')
    .then(res => {
        console.log('Postgres Connected:', res.rows[0]);
        // Run migration check
        return pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'payslips' AND column_name = 'other_deductions_breakdown';
        `);
    })
    .then(res => {
        if (res.rows.length > 0) {
            console.log('Column other_deductions_breakdown exists.');
        } else {
            console.log('Column other_deductions_breakdown MISSING. Adding...');
            return pool.query(`
                ALTER TABLE payslips 
                ADD COLUMN IF NOT EXISTS other_deductions_breakdown JSONB;
            `);
        }
    })
    .then(res => {
        if (res) console.log('Column added successfully.');
        pool.end();
    })
    .catch(err => {
        console.error('Database Error:', err);
        pool.end();
    });
