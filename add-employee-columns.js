const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://neondb_owner:npg_i87GdQzKeYXC@ep-dark-wind-a1fbzqyh-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('⏳ Adding emergency_contact column...');
        await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact JSONB;`);
        console.log('✅ emergency_contact added.');

        console.log('⏳ Adding family column...');
        await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS family JSONB;`);
        console.log('✅ family added.');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

run();
