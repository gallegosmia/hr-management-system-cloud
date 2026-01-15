const { Pool } = require('pg');

const DATABASE_URL = "postgresql://postgres.kxwevzvztrdcksuvkwqf:HR-System-Cloud-2026!@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('Connecting to database...');
        const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'employees';
    `);
        console.log('Columns in employees table:', result.rows);
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
    }
}

run();
