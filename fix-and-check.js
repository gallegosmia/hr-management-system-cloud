const { Pool } = require('pg');

async function fix() {
    const DATABASE_URL = 'postgresql://neondb_owner:npg_vlVJhnqyNk79@ep-broad-truth-a1ouv160-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
    const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

    try {
        console.log('⏳ Adding file_data to documents...');
        await pool.query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_data BYTEA');
        console.log('✅ Column added.');

        console.log('⏳ Verifying employee IDs...');
        const res = await pool.query('SELECT id, first_name FROM employees');
        console.log(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
fix();
