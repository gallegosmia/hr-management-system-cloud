const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_vlVJhnqyNk79@ep-broad-truth-a1ouv160-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: { rejectUnauthorized: false }
});

async function find() {
    const res = await pool.query("SELECT first_name, email_address FROM employees WHERE first_name ILIKE '%SHAHANIE%'");
    console.log('Search for SHAHANIE:', res.rows);
    await pool.end();
}
find();
