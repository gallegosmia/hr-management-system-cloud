const { Pool } = require('pg');

// Use the production URL if available, otherwise just try to connect
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_QoJAXGF4wj9C@ep-dawn-sea-a1nhcz1w-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkColumns() {
    try {
        console.log('Checking users table columns...');
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        `);
        console.log('Columns:', res.rows.map(r => r.column_name));

        const hasResetOtp = res.rows.some(r => r.column_name === 'reset_otp');
        const hasResetOtpExpires = res.rows.some(r => r.column_name === 'reset_otp_expires_at');
        const hasEmail = res.rows.some(r => r.column_name === 'email');

        console.log('Has reset_otp:', hasResetOtp);
        console.log('Has reset_otp_expires_at:', hasResetOtpExpires);
        console.log('Has email:', hasEmail);

    } catch (err) {
        console.error('Check failed:', err.message);
    } finally {
        await pool.end();
    }
}

checkColumns();
