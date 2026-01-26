const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_vlVJhnqyNk79@ep-broad-truth-a1ouv160-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: { rejectUnauthorized: false }
});

async function check() {
    const val1 = 'shahanieelerio1@gmail.com';
    const val2 = 'shahaniemaelerio1@gmail.com';

    const users = await pool.query("SELECT username, email FROM users WHERE email = $1 OR email = $2 OR username ILIKE '%shahanie%'", [val1, val2]);
    console.log('Matching Users:', users.rows);

    await pool.end();
}
check();
