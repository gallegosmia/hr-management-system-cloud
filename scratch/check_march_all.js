const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_PslbEZF85iOH@ep-cold-dew-a1pzda3q.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- ALL March Attendance records ---');
        const res = await pool.query("SELECT date, COUNT(*) as count FROM attendance WHERE date >= '2026-03-01' AND date <= '2026-03-31' GROUP BY date ORDER BY date ASC");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
