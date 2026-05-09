const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_PslbEZF85iOH@ep-cold-dew-a1pzda3q.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' 
});

async function run() {
  try {
    console.log('--- employee_loans ---');
    try {
        const res = await pool.query(
          "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='employee_loans' ORDER BY ordinal_position"
        );
        console.log(res.rows.map(r => r.column_name).join(', '));
    } catch(e) { console.log('employee_loans missing or error:', e.message); }

    console.log('\n--- emergency_loans ---');
    try {
        const res = await pool.query(
          "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='emergency_loans' ORDER BY ordinal_position"
        );
        console.log(res.rows.map(r => r.column_name).join(', '));
    } catch(e) { console.log('emergency_loans missing or error:', e.message); }

  } catch(e) {
    console.error('Fatal Error:', e.message);
  } finally {
    pool.end();
  }
}
run();
