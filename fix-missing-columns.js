const { Pool } = require('pg');
require('dotenv').config();

async function fix() {
    console.log('Connecting to DB...');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Adding missing columns to employees table...');

        // Add gender
        await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender VARCHAR(20)`);
        console.log('✅ Added gender');

        // Add religion
        await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS religion VARCHAR(50)`);
        console.log('✅ Added religion');

        // Add emergency_contact_name
        await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100)`);
        console.log('✅ Added emergency_contact_name');

        // Add emergency_contact_number
        await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_number VARCHAR(50)`);
        console.log('✅ Added emergency_contact_number');

        console.log('🚀 All missing columns added successfully.');
    } catch (e) {
        console.error('❌ Error adding columns:', e.message);
    } finally {
        await pool.end();
    }
}

fix();
