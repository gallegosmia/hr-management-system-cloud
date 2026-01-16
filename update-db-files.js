const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://neondb_owner:npg_i87GdQzKeYXC@ep-dark-wind-a1fbzqyh-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function addFileDataColumn() {
    try {
        console.log('⏳ Adding file_data column to documents table...');
        await pool.query(`
      ALTER TABLE documents 
      ADD COLUMN IF NOT EXISTS file_data BYTEA;
    `);
        console.log('✅ Column added successfully.');

        // Also ensure profiles have picture data if needed, but let's focus on documents first.
    } catch (err) {
        console.error('❌ Error updating schema:', err);
    } finally {
        await pool.end();
    }
}

addFileDataColumn();
