
const { Pool } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('DATABASE_URL is not set in .env file');
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log('🚀 Starting migration for Leave Credits and Audit Logs...\n');
    try {
        // 1. Create audit_logs table
        console.log('📄 Ensuring audit_logs table exists...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                hr_user TEXT NOT NULL,
                employee_id INTEGER NOT NULL,
                action TEXT NOT NULL,
                details TEXT,
                previous_credits DECIMAL(10,2),
                new_credits DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ audit_logs table verified/created.');

        // 2. Add leave_credits column to employees
        console.log('📄 Ensuring leave_credits column exists in employees...');
        try {
            await pool.query("ALTER TABLE employees ADD COLUMN IF NOT EXISTS leave_credits DECIMAL(10,2) DEFAULT 0");
            console.log('✅ leave_credits column verified/added.');
        } catch (colError) {
            // IF 'COLUMN IF NOT EXISTS' is not supported by the PG version, we trap the error if it already exists
            if (colError.message.includes('already exists')) {
                console.log('✅ leave_credits column already exists.');
            } else {
                throw colError;
            }
        }

        console.log('\n🎉 Migration complete!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await pool.end();
    }
}

migrate();
