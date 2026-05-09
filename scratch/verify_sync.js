const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_PslbEZF85iOH@ep-cold-dew-a1pzda3q.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const res = await pool.query("SELECT COUNT(*) FROM attendance WHERE date IN ('2026-03-24', '2026-03-25', '2026-03-26')");
        console.log('Records for Mar 24-26 in Cloud:', res.rows[0].count);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
