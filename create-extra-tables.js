const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://neondb_owner:npg_i87GdQzKeYXC@ep-dark-wind-a1fbzqyh-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('⏳ Creating family_members table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS family_members (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                relationship TEXT,
                birthdate DATE,
                occupation TEXT,
                contact_number TEXT
            );
        `);
        console.log('✅ family_members table created.');

        console.log('⏳ Creating emergency_contacts table...');
        await pool.query(`
             CREATE TABLE IF NOT EXISTS emergency_contacts (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                relationship TEXT,
                phone_number TEXT,
                address TEXT
            );
        `);
        console.log('✅ emergency_contacts table created.');

    } catch (err) {
        console.error('❌ Error creating tables:', err.message);
    } finally {
        await pool.end();
    }
}

run();
