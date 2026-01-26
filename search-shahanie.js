const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_vlVJhnqyNk79@ep-broad-truth-a1ouv160-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: { rejectUnauthorized: false }
});

async function search() {
    console.log('--- Searching for partial "shahanie" ---');
    const empRes = await pool.query("SELECT employee_id, last_name, email_address FROM employees WHERE email_address ILIKE '%shahanie%' OR last_name ILIKE '%shahanie%'");
    console.table(empRes.rows);

    await pool.end();
}
search();
