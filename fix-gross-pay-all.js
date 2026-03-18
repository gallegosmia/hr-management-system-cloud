/**
 * Fix All Payslip Gross Pay & Net Pay
 * -------------------------------------
 * Bug: allowances were divided by 2 before being added to gross pay.
 * Correct formula:
 *   gross_pay = basic_pay + regular_allowance + special_allowance + holiday_pay + other_earnings
 *   net_pay   = gross_pay - total_deductions
 */

const { Pool } = require('pg');
require('dotenv').config();

async function fixAllGrossPay() {
    const DATABASE_URL = process.env.DATABASE_URL;

    if (!DATABASE_URL) {
        console.error('ERROR: DATABASE_URL not set in .env file.');
        process.exit(1);
    }

    console.log('Connecting to DB:', DATABASE_URL.substring(0, 35) + '...');

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('=== Fix All Gross Pay & Net Pay ===\n');

        // Fetch all payslips with employee names
        const result = await pool.query(`
            SELECT
                ps.id,
                ps.employee_id,
                e.first_name,
                e.last_name,
                COALESCE(ps.basic_pay, 0)          AS basic_pay,
                COALESCE(ps.regular_allowance, 0)  AS regular_allowance,
                COALESCE(ps.special_allowance, 0)  AS special_allowance,
                COALESCE(ps.holiday_pay, 0)        AS holiday_pay,
                COALESCE(ps.other_earnings, 0)     AS other_earnings,
                COALESCE(ps.total_deductions, 0)   AS total_deductions,
                COALESCE(ps.gross_pay, 0)          AS old_gross,
                COALESCE(ps.net_pay, 0)            AS old_net
            FROM payslips ps
            JOIN employees e ON e.id = ps.employee_id
            ORDER BY ps.id
        `);

        const payslips = result.rows;
        console.log(`Found ${payslips.length} payslips to process.\n`);

        let updated = 0;
        let skipped = 0;

        for (const ps of payslips) {
            const basicPay = parseFloat(ps.basic_pay);
            const regularAllowance = parseFloat(ps.regular_allowance);
            const specialAllowance = parseFloat(ps.special_allowance);
            const holidayPay = parseFloat(ps.holiday_pay);
            const otherEarnings = parseFloat(ps.other_earnings);
            const totalDeductions = parseFloat(ps.total_deductions);

            const correctGross = Math.round(
                (basicPay + regularAllowance + specialAllowance + holidayPay + otherEarnings) * 100
            ) / 100;
            const correctNet = Math.round((correctGross - totalDeductions) * 100) / 100;

            const oldGross = parseFloat(ps.old_gross);
            const oldNet = parseFloat(ps.old_net);

            // Only update if values actually differ (by more than 0.01 to handle float noise)
            if (Math.abs(correctGross - oldGross) < 0.01 && Math.abs(correctNet - oldNet) < 0.01) {
                skipped++;
                continue;
            }

            await pool.query(
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
        console.log(`✅ Updated : ${updated}`);
        console.log(`⏭  Skipped (already correct): ${skipped}`);

    } catch (err) {
        console.error('❌ Error:', err.message || err);
        console.error('Stack:', err.stack);
    } finally {
        await pool.end();
    }

    process.exit(0);
}

fixAllGrossPay();
