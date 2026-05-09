const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_PslbEZF85iOH@ep-cold-dew-a1pzda3q.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' 
});

async function run() {
  try {
    const tables = ['gov_contribution_configs', 'sss_contribution_table', 'gov_contribution_reports', 'gov_contribution_details'];
    for (const table of tables) {
      const res = await pool.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='${table}' ORDER BY ordinal_position`
      );
      console.log(`\n--- ${table} ---`);
      console.log(res.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
    }
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    pool.end();
  }
}
run();
