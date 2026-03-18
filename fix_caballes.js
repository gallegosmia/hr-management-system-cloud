const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool();
async function check() {
    try {
        const query = await pool.query("SELECT id, first_name, last_name, salary_info FROM employees WHERE last_name ILIKE '%Caballes%'");
        const emp = query.rows[0];
        if (emp) {
            let salary_info = emp.salary_info;
            if (typeof salary_info === 'string') salary_info = JSON.parse(salary_info);

            if (salary_info && salary_info.deductions) {
                salary_info.deductions.pagibig_loan_30th = 0;
            }

            await pool.query("UPDATE employees SET salary_info = $1 WHERE id = $2", [JSON.stringify(salary_info), emp.id]);
            console.log("Updated Eddie Caballes successfully!");
        } else {
            console.log("Caballes not found");
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
check();
