const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://neondb_owner:npg_i87GdQzKeYXC@ep-dark-wind-a1fbzqyh-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function addColumns() {
    try {
        console.log('Adding date columns to emergency_loans...');
        await pool.query(`ALTER TABLE emergency_loans ADD COLUMN IF NOT EXISTS first_release_date DATE`);
        await pool.query(`ALTER TABLE emergency_loans ADD COLUMN IF NOT EXISTS second_release_date DATE`);
        await pool.query(`ALTER TABLE emergency_loans ADD COLUMN IF NOT EXISTS last_release_date DATE`);
        console.log('Successfully added columns.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

addColumns();
