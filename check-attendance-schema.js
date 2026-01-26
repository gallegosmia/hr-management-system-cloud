const { Pool } = require('pg');

async function checkAttendanceTable() {
    const DATABASE_URL = 'postgresql://neondb_owner:npg_vlVJhnqyNk79@ep-broad-truth-a1ouv160-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const res = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'attendance'
        `);
        console.log('Attendance Table Columns:');
        console.log(JSON.stringify(res.rows, null, 2));

        const res2 = await pool.query(`
            SELECT conname, pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE conrelid = 'attendance'::regclass
        `);
        console.log('Constraints:');
        console.log(JSON.stringify(res2.rows, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkAttendanceTable();
