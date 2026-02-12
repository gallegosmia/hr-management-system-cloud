
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
    let url = null;
    if (fs.existsSync(path.join(process.cwd(), '.env'))) {
        const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
        const match = env.match(/^DATABASE_URL=(.+)$/m);
        if (match) url = match[1].trim();
    }

    if (!url) {
        console.error('DATABASE_URL not found in .env');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: url,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Adding leave_credits column to employees table...');
        await pool.query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS leave_credits DECIMAL(4,1) DEFAULT 5.0');
        console.log('Updating existing employees with default leave_credits (5.0)...');
        await pool.query('UPDATE employees SET leave_credits = 5.0 WHERE leave_credits IS NULL');
        console.log('Success!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
        process.exit();
    }
}

migrate();
