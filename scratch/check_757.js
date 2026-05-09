const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PslbEZF85iOH@ep-cold-dew-a1pzda3q.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
      const res = await pool.query("SELECT * FROM attendance WHERE id = 757");
      const record = res.rows[0];
      console.log('Record 757:', record);
      
      if (record) {
          const others = await pool.query("SELECT * FROM attendance WHERE employee_id = $1 AND date::text LIKE '2026-03-06%'", [record.employee_id]);
          console.log('\nOther records for employee on 03-06:', others.rows);
      }
  } catch(e) {
      console.error(e.message);
  } finally {
      await pool.end();
  }
}

run();
