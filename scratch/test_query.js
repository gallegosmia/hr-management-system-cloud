const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PslbEZF85iOH@ep-cold-dew-a1pzda3q.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
      const res = await pool.query("UPDATE attendance SET date = '2026-03-06', status = 'Vacation Leave', remarks = 'Travel: Sulangan, Guian Samar' WHERE id = 757 RETURNING *");
      console.log('Update Success:', res.rows[0]);
  } catch(e) {
      console.error('Update Error:', e.message);
  } finally {
      await pool.end();
  }
}

run();
