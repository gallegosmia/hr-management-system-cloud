const { query } = require('./lib/database.ts'); // Wait, require might fail on ts.
// Let's use the actual db credentials
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/hrms'
});

async function run() {
    const res = await pool.query("SELECT * FROM employees WHERE first_name ILIKE '%Mia%'");
    const mia = res.rows[0];
    if (!mia) {
        console.log("Mia not found.");
        process.exit(1);
    }
    console.log("Mia salary info company_loan_balance:", mia.salary_info?.deductions?.company_loan_balance);
    
    const loans = await pool.query("SELECT * FROM employee_loans WHERE employee_id = $1", [mia.id]);
    console.log("Mia loans:", loans.rows);
    
    process.exit(0);
}

run();
