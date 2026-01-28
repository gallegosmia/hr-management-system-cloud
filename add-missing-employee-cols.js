const { Pool } = require('pg');

// Correct DATABASE_URL from .env
const DATABASE_URL = 'postgresql://neondb_owner:npg_QoJAXGF4wj9C@ep-dawn-sea-a1nhcz1w-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function addMissingColumns() {
    try {
        console.log('⏳ Adding missing columns to employees table (Correct DB)...');

        const queries = [
            "ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender VARCHAR(50);",
            "ALTER TABLE employees ADD COLUMN IF NOT EXISTS civil_status VARCHAR(50);",
            "ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_picture TEXT;",
            "ALTER TABLE employees ADD COLUMN IF NOT EXISTS place_of_birth TEXT;",
            "ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_of_birth DATE;",
            "ALTER TABLE employees ADD COLUMN IF NOT EXISTS blood_type VARCHAR(10);",
            "ALTER TABLE employees ADD COLUMN IF NOT EXISTS religion VARCHAR(100);",
            "ALTER TABLE employees ADD COLUMN IF NOT EXISTS citizen_id_address TEXT;",
            "ALTER TABLE employees ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);",
            "ALTER TABLE employees ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50);",
            "ALTER TABLE employees ADD COLUMN IF NOT EXISTS email_address VARCHAR(150);",
            "ALTER TABLE employees ADD COLUMN IF NOT EXISTS address TEXT;",
            "ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_status VARCHAR(50);"
        ];

        for (const query of queries) {
            try {
                await pool.query(query);
                console.log(`✅ Executed: ${query}`);
            } catch (e) {
                console.warn(`⚠️ Failed: ${query} - ${e.message}`);
            }
        }

        console.log('🎉 Column additions completed on the correct database.');
    } catch (err) {
        console.error('❌ Critical Error:', err);
    } finally {
        await pool.end();
    }
}

addMissingColumns();
