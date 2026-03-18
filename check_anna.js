const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
    const res = await pool.query("SELECT id, first_name, last_name, salary_info FROM employees WHERE first_name ILIKE '%Anna%'");
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
}
check();
