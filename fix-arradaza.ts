import { query } from './lib/database';

async function run() {
    try {
        console.log('Fetching Arradaza...');
        const res = await query("SELECT id, first_name, last_name, special_allowance FROM employees WHERE last_name ILIKE '%Arradaza%'");
        console.log('Found Employees:', res.rows);

        if (res.rows.length > 0) {
            const empId = res.rows[0].id;
            console.log(`Updating employee ${empId}`);
            const updateRes = await query("UPDATE employees SET special_allowance = 500 WHERE id = $1 RETURNING *", [empId]);
            console.log('Updated Employee:', updateRes.rows[0]);

            // Also update any active payslips
            const payslipUpdateRes = await query("UPDATE payslips SET special_allowance = 500 WHERE employee_id = $1 RETURNING *", [empId]);
            console.log(`Updated active payslips for employee ${empId}:`, payslipUpdateRes.rowCount);

            // Re-calculate the gross and net pay for the changed payslips
            const updatedPayslips = await query("SELECT id, basic_pay, regular_allowance, special_allowance, holiday_pay, total_deductions FROM payslips WHERE employee_id = $1", [empId]);
            for (const payslip of updatedPayslips.rows) {
                const grossPay = parseFloat(payslip.basic_pay || 0) +
                    parseFloat(payslip.regular_allowance || 0) +
                    parseFloat(payslip.special_allowance || 0) +
                    parseFloat(payslip.holiday_pay || 0);
                const netPay = grossPay - parseFloat(payslip.total_deductions || 0);

                await query("UPDATE payslips SET gross_pay = $1, net_pay = $2 WHERE id = $3", [grossPay, netPay, payslip.id]);
                console.log(`Updated payslip ${payslip.id} totals.`);
            }
        }
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit();
}
run();
