const { Pool } = require('pg');

// Correct DATABASE_URL
const DATABASE_URL = 'postgresql://neondb_owner:npg_QoJAXGF4wj9C@ep-dawn-sea-a1nhcz1w-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function addExtraColumns() {
    try {
        console.log('⏳ Adding extra columns to employees table...');

        const queries = [
            "ALTER TABLE employees ADD COLUMN IF NOT EXISTS religion VARCHAR(100);",
            "ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(150);",
            "ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_number VARCHAR(50);"
        ];

        for (const query of queries) {
            try {
                await pool.query(query);
                console.log(`✅ Executed: ${query}`);
            } catch (e) {
                console.warn(`⚠️ Failed: ${query} - ${e.message}`);
            }
        }

        console.log('🎉 Extra column additions completed.');
    } catch (err) {
        console.error('❌ Critical Error:', err);
    } finally {
        await pool.end();
    }
}

addExtraColumns();
