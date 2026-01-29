const { Pool } = require('pg');
require('dotenv').config();

async function verify() {
    console.log('Connecting to:', process.env.DATABASE_URL.split('@')[1]); // Log host only for privacy

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const tables = ['users', 'employees', 'attendance', 'leave_requests', 'payroll_runs', 'payslips', 'settings', 'documents', 'education'];

        console.log('\n📊 Row Counts in New Database:');
        console.log('--------------------------------');

        for (const table of tables) {
            try {
                const res = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`${table.padEnd(20)}: ${res.rows[0].count}`);
            } catch (e) {
                console.log(`${table.padEnd(20)}: ❌ (Table might not exist)`);
            }
        }

    } catch (e) {
        console.error('Connection failed:', e.message);
    } finally {
        await pool.end();
    }
}

verify();
