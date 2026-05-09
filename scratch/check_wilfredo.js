
const { query } = require('../lib/database');

async function checkWilfredo() {
    try {
        const res = await query("SELECT id, last_name, first_name, salary_info FROM employees WHERE last_name ILIKE '%Lahoylahoy%'", []);
        console.log('Employee:', JSON.stringify(res.rows, null, 2));

        if (res.rows.length > 0) {
            const empId = res.rows[0].id;
            const detailsRes = await query("SELECT d.*, r.contribution_type, r.payroll_period FROM gov_contribution_details d JOIN gov_contribution_reports r ON d.report_id = r.id WHERE d.employee_id = $1 ORDER BY r.created_at DESC LIMIT 5", [empId]);
            console.log('Contribution Details:', JSON.stringify(detailsRes.rows, null, 2));
        }
    } catch (e) {
        console.error(e);
    }
    process.exit();
}

checkWilfredo();
