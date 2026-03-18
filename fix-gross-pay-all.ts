import { query } from './lib/database';

/**
 * Fix All Payslip Gross Pay & Net Pay
 * -------------------------------------
 * Bug: allowances were divided by 2 before being added to gross pay.
 * Correct formula:
 *   gross_pay = basic_pay + regular_allowance + special_allowance + holiday_pay + other_earnings
 *   net_pay   = gross_pay - total_deductions
 */
async function fixAllGrossPay() {
    try {
        console.log('=== Fix All Gross Pay & Net Pay ===\n');

        // Fetch all payslips
        const result = await query(`
            SELECT
                ps.id,
                ps.employee_id,
                e.first_name,
                e.last_name,
                ps.basic_pay,
                ps.regular_allowance,
                ps.special_allowance,
                ps.holiday_pay,
                ps.other_earnings,
                ps.total_deductions,
                ps.gross_pay   AS old_gross,
                ps.net_pay     AS old_net
            FROM payslips ps
            JOIN employees e ON e.id = ps.employee_id
            ORDER BY ps.id
        `);

        const payslips = result.rows;
        console.log(`Found ${payslips.length} payslips to process.\n`);

        let updated = 0;
        let skipped = 0;

        for (const ps of payslips) {
            const basicPay = parseFloat(ps.basic_pay || 0);
            const regularAllowance = parseFloat(ps.regular_allowance || 0);
            const specialAllowance = parseFloat(ps.special_allowance || 0);
            const holidayPay = parseFloat(ps.holiday_pay || 0);
            const otherEarnings = parseFloat(ps.other_earnings || 0);
            const totalDeductions = parseFloat(ps.total_deductions || 0);

            const correctGross = Math.round(
                (basicPay + regularAllowance + specialAllowance + holidayPay + otherEarnings) * 100
            ) / 100;
            const correctNet = Math.round((correctGross - totalDeductions) * 100) / 100;

            const oldGross = parseFloat(ps.old_gross || 0);
            const oldNet = parseFloat(ps.old_net || 0);

            // Only update if values actually differ
            if (Math.abs(correctGross - oldGross) < 0.01 && Math.abs(correctNet - oldNet) < 0.01) {
                skipped++;
                continue;
            }

            await query(
                `UPDATE payslips SET gross_pay = $1, net_pay = $2 WHERE id = $3`,
                [correctGross, correctNet, ps.id]
            );

            console.log(
                `[FIXED] Payslip #${ps.id} | ${ps.last_name}, ${ps.first_name} | ` +
                `Gross: ${oldGross.toFixed(2)} → ${correctGross.toFixed(2)} | ` +
                `Net: ${oldNet.toFixed(2)} → ${correctNet.toFixed(2)}`
            );
            updated++;
        }

        console.log(`\n=== Done ===`);
        console.log(`Updated : ${updated}`);
        console.log(`Skipped (already correct): ${skipped}`);
    } catch (err: any) {
        console.error('Error:', err.message);
    }

    process.exit(0);
}

fixAllGrossPay();
