const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function checkTables() {
    const DB_FILE = path.join(process.cwd(), 'data', 'database.json');
    let DATABASE_URL = process.env.DATABASE_URL;

    if (!DATABASE_URL) {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const match = envContent.match(/DATABASE_URL=['"]?(.+?)['"]?\s*$/m);
            if (match) DATABASE_URL = match[1];
        }
    }

    if (!DATABASE_URL) {
        console.log('Using Local JSON DB');
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        console.log('Tables in JSON:', Object.keys(db));
        if (db.employee_loans) console.log('employee_loans count:', db.employee_loans.length);
        return;
    }

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Pg Tables:', res.rows.map(r => r.table_name));

        const loans = await pool.query('SELECT * FROM employee_loans LIMIT 1');
        console.log('employee_loans columns:', Object.keys(loans.rows[0] || {}));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkTables();
