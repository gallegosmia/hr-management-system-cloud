const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PslbEZF85iOH@ep-cold-dew-a1pzda3q.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
      const others = await pool.query("SELECT id, date, status FROM attendance WHERE employee_id = 6 AND date >= '2026-03-04' AND date <= '2026-03-08'");
      console.log('Employee 6 records around Mar 6:', others.rows);
  } catch(e) {
      console.error(e.message);
  } finally {
      await pool.end();
  }
}

run();
