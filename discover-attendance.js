const { Client } = require('pg');

const urls = [
    { name: 'Dark Wind', url: 'postgresql://neondb_owner:npg_i87GdQzKeYXC@ep-dark-wind-a1fbzqyh-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' },
    { name: 'Cold Dew', url: 'postgresql://neondb_owner:npg_PslbEZF85iOH@ep-cold-dew-a1pzda3q-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' }
];

async function check() {
    for (const item of urls) {
        console.log(`⏳ Checking ${item.name}...`);
        const client = new Client({ connectionString: item.url, ssl: { rejectUnauthorized: false } });
        try {
            await client.connect();
            const res = await client.query('SELECT COUNT(*) FROM attendance WHERE date >= $1', ['2026-03-01']);
            console.log(`✅ ${item.name}: March Attendance Count = ${res.rows[0].count}`);
        } catch (e) {
            console.error(`❌ ${item.name} Error:`, e.message);
        } finally {
            await client.end().catch(() => {});
        }
    }
}

check();
