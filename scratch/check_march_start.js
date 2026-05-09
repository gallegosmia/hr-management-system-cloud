const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_PslbEZF85iOH@ep-cold-dew-a1pzda3q.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const res = await pool.query("SELECT a.date, a.status, e.branch FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.date >= '2026-02-28' AND a.date <= '2026-03-05' AND e.branch = 'Ormoc' ORDER BY a.date ASC");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
