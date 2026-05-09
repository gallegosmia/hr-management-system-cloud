

// Let's use a postgres client directly to run the EXACT same SQL and capture the error!
const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const c = new Client({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });

async function test() {
    await c.connect();
    try {
        const placeholders = ['($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)'];
        const values = [1, '2026-04-01', null, null, null, null, null, null, 'Present', null];

        const sql = `
            INSERT INTO attendance (employee_id, date, time_in, time_out, morning_in, morning_out, afternoon_in, afternoon_out, status, remarks)
            VALUES ${placeholders.join(', ')}
            ON CONFLICT (employee_id, date) 
            DO UPDATE SET 
                time_in = EXCLUDED.time_in,
                time_out = EXCLUDED.time_out,
                morning_in = EXCLUDED.morning_in,
                morning_out = EXCLUDED.morning_out,
                afternoon_in = EXCLUDED.afternoon_in,
                afternoon_out = EXCLUDED.afternoon_out,
                status = EXCLUDED.status,
                remarks = EXCLUDED.remarks,
                updated_at = CURRENT_TIMESTAMP
        `;

        await c.query(sql, values);
        console.log("Success!");
    } catch(e) {
        console.error("SQL Error:", e.message);
    } finally {
        await c.end();
    }
}
test();
