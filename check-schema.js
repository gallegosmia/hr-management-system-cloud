const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://neondb_owner:npg_i87GdQzKeYXC@ep-dark-wind-a1fbzqyh-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
    try {
        console.log('Checking documents table schema...');
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'documents';
    `);
        res.rows.forEach(row => console.log(`${row.column_name}: ${row.data_type}`));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkSchema();
