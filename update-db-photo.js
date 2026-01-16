const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://neondb_owner:npg_i87GdQzKeYXC@ep-dark-wind-a1fbzqyh-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function addProfilePicColumn() {
    try {
        console.log('⏳ Adding profile_picture_data column to employees table...');
        await pool.query(`
      ALTER TABLE employees 
      ADD COLUMN IF NOT EXISTS profile_picture_data BYTEA;
    `);
        console.log('✅ Column added successfully.');
    } catch (err) {
        console.error('❌ Error updating schema:', err);
    } finally {
        await pool.end();
    }
}

addProfilePicColumn();
