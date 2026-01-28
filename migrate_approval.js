const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://neondb_owner:npg_QoJAXGF4wj9C@ep-dawn-sea-a1nhcz1w-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log('Starting migration...');
    try {
        // Add status column to users if it doesn't exist
        await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
        `);
        console.log('Added status column to users');

        // Update existing active users
        await pool.query(`
            UPDATE users SET status = 'ACTIVE' WHERE is_active = 1 AND (status IS NULL OR status = '');
        `);
        await pool.query(`
            UPDATE users SET status = 'PENDING_APPROVAL' WHERE is_active = 0 AND (status IS NULL OR status = '');
        `);
        console.log('Updated user statuses');

        // Create admin_approval_queue table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admin_approval_queue (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                full_name TEXT,
                email TEXT,
                role VARCHAR(50),
                status VARCHAR(50) DEFAULT 'PENDING',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                processed_at TIMESTAMP WITH TIME ZONE,
                processed_by INTEGER REFERENCES users(id)
            );
        `);
        console.log('Created admin_approval_queue table');

        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
}

migrate();
