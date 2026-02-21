
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function cleanDeductions() {
    let DATABASE_URL = process.env.DATABASE_URL;

    if (!DATABASE_URL) {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const match = envContent.match(/DATABASE_URL=['"]?(.+?)['"]?\s*$/m);
            if (match) DATABASE_URL = match[1];
        }
    }

    if (!DATABASE_URL) {
        console.error('❌ DATABASE_URL not found.');
        return;
    }

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Connecting to database...');
        const res = await pool.query('SELECT id, deductions FROM payslips');
        console.log(`✅ Found ${res.rowCount} payslips.`);

        let updatedCount = 0;

        for (const row of res.rows) {
            let deductions = row.deductions;
            if (typeof deductions === 'string') {
                try {
                    deductions = JSON.parse(deductions);
                } catch (e) {
                    console.error(`Error parsing deductions for payslip ${row.id}`, e);
                    continue;
                }
            }

            if (!deductions || !deductions.other_deductions || !Array.isArray(deductions.other_deductions)) {
                continue;
            }

            const initialLength = deductions.other_deductions.length;
            const newOtherDeductions = deductions.other_deductions.filter(d => {
                const note = (d.note || '').toLowerCase();
                const amount = parseFloat(d.amount);

                // Criteria to remove: 
                // 1. Note contains 'state' OR 'ec'
                // 2. Amount is 450
                if (note.includes('state') || note.includes('ec') || amount === 450) {
                    console.log(`🗑️ Removing deduction from payslip ${row.id}:`, JSON.stringify(d));
                    return false; // Remove
                }
                return true; // Keep
            });

            if (newOtherDeductions.length !== initialLength) {
                deductions.other_deductions = newOtherDeductions;

                // Recalculate total deductions if necessary? 
                // Usually total_deductions is a separate column or calculated property. 
                // For safety, we just update the deductions object. 
                // The total_deductions column involves more math (stats + loans etc).
                // Usually the UI sums it up or the backend does.
                // We should also look for a 'total_deductions' property inside 'deductions' object if it exists?
                // lib/payroll-calculations.ts returns 'totalDeductions' as a separate field, not inside 'deductions'.

                // Update the row
                await pool.query('UPDATE payslips SET deductions = $1 WHERE id = $2', [deductions, row.id]);
                updatedCount++;
            }
        }

        console.log(`🎉 Cleanup complete. Updated ${updatedCount} payslips.`);

    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await pool.end();
    }
}

cleanDeductions();
