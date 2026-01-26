const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_vlVJhnqyNk79@ep-broad-truth-a1ouv160-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: { rejectUnauthorized: false }
});

async function find() {
    const val = 'shahaniemaelerio1@gmail.com';
    console.log(`--- Searching for: ${val} ---`);
    const userRes = await pool.query("SELECT username, email FROM users WHERE username = $1 OR email = $1", [val]);
    console.log('Users Table:', userRes.rows);

    const empRes = await pool.query("SELECT employee_id, last_name, email_address FROM employees WHERE email_address = $1", [val]);
    console.log('Employees Table:', empRes.rows);

    await pool.end();
}
find();
