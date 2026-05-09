const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_PslbEZF85iOH@ep-cold-dew-a1pzda3q.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- Table Schema ---');
        const schema = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'attendance'");
        console.log(JSON.stringify(schema.rows, null, 2));

        console.log('\n--- March Records (All Branches) ---');
        const marchCount = await pool.query("SELECT COUNT(*) FROM attendance WHERE date::text LIKE '2026-03%'");
        console.log('Total records in March:', marchCount.rows[0].count);

        console.log('\n--- Sample Records around March 1st ---');
        const sample = await pool.query("SELECT id, employee_id, date, status FROM attendance WHERE date >= '2026-02-25' AND date <= '2026-03-05' ORDER BY date ASC");
        console.log(JSON.stringify(sample.rows, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
