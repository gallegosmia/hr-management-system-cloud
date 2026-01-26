const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_vlVJhnqyNk79@ep-broad-truth-a1ouv160-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: { rejectUnauthorized: false }
});

async function find() {
    const res = await pool.query("SELECT last_name, email_address FROM employees WHERE last_name ILIKE '%ELERIO%'");
    console.log('Search for ELERIO:', res.rows);
    await pool.end();
}
find();
