const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_PslbEZF85iOH@ep-cold-dew-a1pzda3q.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- March Attendance Distribution ---');
        const res = await pool.query("SELECT date FROM attendance WHERE date >= '2026-03-01' AND date <= '2026-03-31' ORDER BY date ASC");
        
        const grouped = res.rows.reduce((acc, r) => {
            // Convert to local date string (Philippines is +8)
            const date = new Date(r.date);
            date.setHours(date.getHours() + 8); 
            const d = date.toISOString().split('T')[0];
            if (!acc[d]) acc[d] = 0;
            acc[d]++;
            return acc;
        }, {});
        
        console.log(JSON.stringify(grouped, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
