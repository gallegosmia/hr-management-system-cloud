const { Pool } = require('pg');

async function checkKeys() {
    const DATABASE_URL = 'postgresql://neondb_owner:npg_vlVJhnqyNk79@ep-broad-truth-a1ouv160-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
    const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

    try {
        const res = await pool.query('SELECT * FROM employees LIMIT 1');
        if (res.rows.length > 0) {
            console.log('Keys in employee row:');
            console.log(Object.keys(res.rows[0]));
        } else {
            console.log('No employees found');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
checkKeys();
