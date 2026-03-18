const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool();
async function check() {
    const res = await pool.query("SELECT id, first_name, last_name, salary_info FROM employees WHERE salary_info::text ILIKE '%pagibig_loan%' OR salary_info::text ILIKE '%1773.3%'");
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
}
check();
