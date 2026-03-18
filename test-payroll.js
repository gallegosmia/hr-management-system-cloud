require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function testPayrollLogic() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        // 1. Get SSS Config
        const year = 2026;
        const configRes = await pool.query(`SELECT config_data FROM gov_contribution_configs WHERE type = 'SSS' AND year_effective = $1`, [year]);

        if (configRes.rows.length === 0) {
            console.log("❌ SSS Config not found for 2026. This would throw an error in the API.");
            return;
        }

        const sssConfig = configRes.rows[0].config_data;
        const brackets = Array.isArray(sssConfig) ? sssConfig : [];

        console.log(`✅ Fetched SSS Config with ${brackets.length} brackets.`);

        // 2. Fetch a dummy employee to test against
        const empRes = await pool.query(`SELECT * FROM employees LIMIT 1`);
        if (empRes.rows.length === 0) {
            console.log("❌ No employees found to test.");
            return;
        }

        const employee = empRes.rows[0];
        const salaryInfo = typeof employee.salary_info === 'string' ? JSON.parse(employee.salary_info) : employee.salary_info;

        const monthlySalary = parseFloat(salaryInfo.monthly_salary) || 0;
        const regularAllowance = (parseFloat(salaryInfo.allowances?.regular) || 0) / 2;
        const specialAllowance = (parseFloat(salaryInfo.allowances?.special) || 0) / 2;
        const fullMonthGross = monthlySalary + (regularAllowance * 2) + (specialAllowance * 2);

        console.log(`Testing Employee: ${employee.first_name} ${employee.last_name}`);
        console.log(`Monthly Salary: ${monthlySalary}`);
        console.log(`Full Month Gross: ${fullMonthGross}`);

        const matchingBracket = brackets.find((b) => fullMonthGross >= Number(b.range_start) && fullMonthGross <= Number(b.range_end)) || brackets[brackets.length - 1];

        if (!matchingBracket) {
            console.log(`❌ No matching bracket for salary ${fullMonthGross}. This would throw a validation error.`);
        } else {
            console.log(`✅ Match Found! Bracket Range: ${matchingBracket.range_start} - ${matchingBracket.range_end}`);
            console.log(`Computed SSS ER: ${Number(matchingBracket.er_share) + Number(matchingBracket.ec)}`);
        }

    } catch (err) {
        console.error("Test failed:", err);
    } finally {
        await pool.end();
    }
}

testPayrollLogic();
