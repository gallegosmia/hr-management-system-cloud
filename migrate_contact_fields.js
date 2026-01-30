require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting Contact Fields Migration...');

        // Add emergency_contact_relationship
        await client.query(`
            ALTER TABLE employees 
            ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100),
            ADD COLUMN IF NOT EXISTS emergency_contact_address TEXT,
            ADD COLUMN IF NOT EXISTS citizen_id_address TEXT
        `);

        console.log('✅ Added emergency_contact_relationship column');
        console.log('✅ Added emergency_contact_address column');
        console.log('✅ Added citizen_id_address column');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch(console.error);
