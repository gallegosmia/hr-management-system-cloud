import { query } from '../lib/database';

async function main() {
    try {
        console.log('Inserting mock notification matching the new PAYROLL_SUBMITTED payload...');
        const users = await query("SELECT id FROM users LIMIT 1");
        if (users.rows.length === 0) {
            console.log("No users found.");
            return;
        }

        const userId = users.rows[0].id;

        await query(`
            INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type, is_read, created_at, link)
            VALUES ($1, $2, $3, $4, $5, $6, 0, NOW(), $7)
        `, [
            userId,
            'PAYROLL_SUBMITTED',
            'Payroll Submitted',
            `Payroll for Feb 1–15, 2026 is pending approval.`,
            '999',
            'payroll',
            `/payroll/999`
        ]);

        console.log('Mock PAYROLL_SUBMITTED inserted successfully.');

        console.log('Inserting mock PAYROLL_PENDING_VP...');
        await query(`
            INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type, is_read, created_at, link)
            VALUES ($1, $2, $3, $4, $5, $6, 0, NOW(), $7)
        `, [
            userId,
            'PAYROLL_PENDING_VP',
            'Payroll Awaiting VP Approval',
            `Payroll for Feb 1–15, 2026 requires your approval.`,
            '999',
            'payroll',
            `/payroll/999`
        ]);

        console.log('Inserting mock PAYROLL_RELEASED...');
        await query(`
            INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type, is_read, created_at, link)
            VALUES ($1, $2, $3, $4, $5, $6, 0, NOW(), $7)
        `, [
            userId,
            'PAYROLL_RELEASED',
            'Payroll Released',
            `Payroll for Feb 1–15, 2026 has been successfully released.`,
            '999',
            'payroll',
            `/payroll/999`
        ]);

        console.log('All test notifications inserted.');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit(0);
    }
}

main();
