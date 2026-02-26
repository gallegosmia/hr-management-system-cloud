const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.join(process.cwd(), '.env');
let url = null;
if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf-8');
    const match = env.match(/^DATABASE_URL=(.+)$/m);
    if (match) url = match[1].trim();
}

if (!url) {
    const envLocalPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
        const env = fs.readFileSync(envLocalPath, 'utf-8');
        const match = env.match(/^DATABASE_URL=(.+)$/m);
        if (match) url = match[1].trim();
    }
}

if (!url) {
    console.log('No DATABASE_URL found, assuming JSON DB (no migration needed for JSON DB)');
    process.exit(0);
}

const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log('Adding other_deductions_breakdown column to payslips table...');
        await pool.query(`
            ALTER TABLE payslips 
            ADD COLUMN IF NOT EXISTS other_deductions_breakdown JSONB;
        `);
        console.log('Column added successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        pool.end();
    }
}

migrate();
