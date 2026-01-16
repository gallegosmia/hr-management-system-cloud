const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://neondb_owner:npg_i87GdQzKeYXC@ep-dark-wind-a1fbzqyh-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixSchema() {
    try {
        console.log('⏳ Checking if file_data exists...');
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'documents' AND column_name = 'file_data';
    `);

        if (res.rows.length === 0) {
            console.log('⚠️ Column MISSING. Adding file_data column to documents table...');
            await pool.query(`
          ALTER TABLE documents 
          ADD COLUMN IF NOT EXISTS file_data BYTEA;
        `);
            console.log('✅ Column added successfully.');
        } else {
            console.log('✅ Column already exists.');
        }

    } catch (err) {
        console.error('❌ Error updating schema:', err);
    } finally {
        await pool.end();
    }
}

fixSchema();
