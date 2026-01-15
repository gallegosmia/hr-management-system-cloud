const { Pool } = require('pg');

const DATABASE_URL = "postgresql://postgres.kxwevzvztrdcksuvkwqf:HR-System-Cloud-2026!@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('Connecting to database...');
        // Add profile_picture column
        await pool.query('ALTER TABLE employees ADD COLUMN profile_picture TEXT');
        console.log('✅ Successfully added profile_picture column');
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
    }
}

run();
