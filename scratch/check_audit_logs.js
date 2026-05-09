const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_PslbEZF85iOH@ep-cold-dew-a1pzda3q.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- Audit Logs for March 24-27 ---');
        // Note: audit_logs might use performed_at instead of created_at based on lib/database.ts
        const res = await pool.query("SELECT * FROM audit_logs WHERE created_at >= '2026-03-24' AND created_at <= '2026-03-28' ORDER BY created_at ASC");
        console.log(JSON.stringify(res.rows, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
