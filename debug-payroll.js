/**
 * Debug script to check payroll run and payslips
 * Run this to see what's happening with the payroll run
 */

const db = require('./lib/database').default;

async function debugPayrollRun() {
    try {
        // Get the latest payroll run
        const runResult = await db.query(`
            SELECT * FROM payroll_runs 
            ORDER BY created_at DESC 
            LIMIT 1
        `);

        if (runResult.rows.length === 0) {
            console.log('❌ No payroll runs found');
            return;
        }

        const run = runResult.rows[0];
        console.log('\n📋 Payroll Run Details:');
        console.log(`  ID: ${run.id}`);
        console.log(`  Run Number: ${run.run_number}`);
        console.log(`  Branch: ${run.branch}`);
        console.log(`  Period: ${run.payroll_period_start} to ${run.payroll_period_end}`);
        console.log(`  Status: ${run.status}`);

        // Get payslips for this run
        const payslipsResult = await db.query(`
            SELECT COUNT(*) as count, SUM(net_pay) as total_net_pay
            FROM payslips
            WHERE payroll_run_id = $1
        `, [run.id]);

        const stats = payslipsResult.rows[0];
        console.log(`\n💰 Payslip Statistics:`);
        console.log(`  Employee Count: ${stats.count || 0}`);
        console.log(`  Total Net Pay: ₱${(stats.total_net_pay || 0).toFixed(2)}`);

        // Get individual payslips
        const detailsResult = await db.query(`
            SELECT 
                ps.*,
                e.first_name,
                e.last_name,
                e.employment_status
            FROM payslips ps
            LEFT JOIN employees e ON ps.employee_id = e.id
            WHERE ps.payroll_run_id = $1
            LIMIT 5
        `, [run.id]);

        if (detailsResult.rows.length > 0) {
            console.log(`\n👥 Sample Payslips (first 5):`);
            detailsResult.rows.forEach((ps, i) => {
                console.log(`  ${i + 1}. ${ps.first_name} ${ps.last_name}`);
                console.log(`     Status: ${ps.employment_status}`);
                console.log(`     Days: ${ps.payroll_days}, Net Pay: ₱${(ps.net_pay || 0).toFixed(2)}`);
            });
        } else {
            console.log('\n❌ No payslips found for this payroll run!');

            // Check eligible employees
            console.log('\n🔍 Checking eligible employees...');
            const empResult = await db.query(`
                SELECT 
                    id,
                    first_name,
                    last_name,
                    branch,
                    employment_status,
                    date_separated,
                    salary_info
                FROM employees
                WHERE branch = $1
                AND employment_status NOT IN ('Resigned', 'Terminated', 'AWOL')
                LIMIT 5
            `, [run.branch]);

            console.log(`  Found ${empResult.rows.length} employees in ${run.branch} branch`);
            empResult.rows.forEach((emp, i) => {
                const hasSalary = emp.salary_info && emp.salary_info !== '{}';
                console.log(`  ${i + 1}. ${emp.first_name} ${emp.last_name}`);
                console.log(`     Status: ${emp.employment_status}`);
                console.log(`     Has Salary Info: ${hasSalary ? 'Yes' : 'No'}`);
                console.log(`     Separated: ${emp.date_separated || 'N/A'}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

debugPayrollRun();
