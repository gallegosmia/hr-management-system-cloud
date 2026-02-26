const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/hr_system'
});

async function fixAttendance() {
    try {
        const res = await pool.query("SELECT * FROM attendance WHERE date = '2026-02-20'");
        const records = res.rows;
        console.log(`Found ${records.length} records. Fixing statuses...`);

        for (let record of records) {
            if (!record.morning_in && !record.time_in) {
                continue; // Leave as absent if truly no time
            }

            let newStatus = 'Present';
            const inTime = record.morning_in || record.time_in;
            const outTime = record.afternoon_out || record.morning_out || record.time_out;

            if (inTime >= '12:00') {
                newStatus = 'Half-Day';
            } else if (inTime >= '08:01') {
                newStatus = 'Late';
            }

            // Don't overwrite leaves
            if (record.status && record.status.toLowerCase().includes('leave')) {
                newStatus = record.status;
            }

            await pool.query("UPDATE attendance SET status = $1 WHERE id = $2", [newStatus, record.id]);
            console.log(`Updated Employee ID ${record.employee_id}: ${record.status} -> ${newStatus}`);
        }

        console.log("Finished updating records.");
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

fixAttendance();
