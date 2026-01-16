const { Pool } = require('pg');
const DATABASE_URL = 'postgresql://neondb_owner:npg_i87GdQzKeYXC@ep-dark-wind-a1fbzqyh-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkCol() {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'file_data'");
        if (res.rows.length > 0) console.log('✅ file_data column EXISTS');
        else console.log('❌ file_data column MISSING');
    } catch (err) { console.error(err); } finally { await pool.end(); }
}
checkCol();
