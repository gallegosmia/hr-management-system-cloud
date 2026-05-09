const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_PslbEZF85iOH@ep-cold-dew-a1pzda3q.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- Attendance Records for March 24-27 ---');
        const res = await pool.query("SELECT a.id, a.date, a.status, e.branch, e.first_name, e.last_name FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.date >= '2026-03-24' AND a.date <= '2026-03-27' ORDER BY a.date ASC");
        
        if (res.rows.length === 0) {
            console.log('No records found in this range.');
        } else {
            console.log(`Found ${res.rows.length} records.`);
            // Group by date to see gaps
            const grouped = res.rows.reduce((acc, r) => {
                const d = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0];
                if (!acc[d]) acc[d] = 0;
                acc[d]++;
                return acc;
            }, {});
            console.log('Records per day:', grouped);
        }

        // Also check if there are ANY records for these specific dates across all employees
        const specific = await pool.query("SELECT COUNT(*) FROM attendance WHERE date::text LIKE '2026-03-25%' OR date::text LIKE '2026-03-26%'");
        console.log('\nDirect check for 03-25 and 03-26:', specific.rows[0].count);

        // Check if there was a problem with the date storage (timezone shift)
        const checkShift = await pool.query("SELECT date FROM attendance WHERE date::text LIKE '2026-03-24%' LIMIT 1");
        if (checkShift.rows.length > 0) {
            console.log('\nRaw date example for March 24th:', checkShift.rows[0].date);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
