const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_PslbEZF85iOH@ep-cold-dew-a1pzda3q.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' 
});

async function run() {
  try {
    console.log('--- gov_contribution_reports ---');
    const reportsRes = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='gov_contribution_reports' ORDER BY ordinal_position"
    );
    console.log(reportsRes.rows.map(r => r.column_name).join(', '));

    console.log('\n--- gov_contribution_details ---');
    const detailsRes = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='gov_contribution_details' ORDER BY ordinal_position"
    );
    console.log(detailsRes.rows.map(r => r.column_name).join(', '));

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    pool.end();
  }
}
run();
