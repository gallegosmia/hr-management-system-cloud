import { query } from './lib/database';

async function run() {
    try {
        const empId = 1; // Arradaza's ID
        console.log(`Updating employee ${empId} special allowance to 750...`);

        // Update the employee profile
        await query("UPDATE employees SET special_allowance = 750 WHERE id = $1 RETURNING *", [empId]);

        // Update active payslips
        const payslipUpdateRes = await query("UPDATE payslips SET special_allowance = 750 WHERE employee_id = $1 RETURNING *", [empId]);
        console.log(`Updated ${payslipUpdateRes.rowCount} payslips.`);

        // Re-calculate the gross and net pay for the changed payslips
        const updatedPayslips = await query("SELECT id, basic_pay, regular_allowance, special_allowance, holiday_pay, total_deductions FROM payslips WHERE employee_id = $1", [empId]);
        for (const payslip of updatedPayslips.rows) {
            const grossPay = parseFloat(payslip.basic_pay || 0) +
                parseFloat(payslip.regular_allowance || 0) +
                parseFloat(payslip.special_allowance || 0) +
                parseFloat(payslip.holiday_pay || 0);
            const netPay = grossPay - parseFloat(payslip.total_deductions || 0);

            await query("UPDATE payslips SET gross_pay = $1, net_pay = $2 WHERE id = $3", [grossPay, netPay, payslip.id]);
        }
        console.log('Recalculation complete.');
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit();
}
run();
