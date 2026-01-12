const { Pool } = require('pg');

const pool = new Pool({
    // Using the forced correct connection string
    connectionString: "postgresql://postgres.kxwevzvztrdcksuvkwqf:HR-System-Cloud-2026!@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
    ssl: { rejectUnauthorized: false }
});

async function patchDatabase() {
    try {
        console.log('🔌 Connecting to database...');

        // Add last_updated column to users table to fix login error
        console.log('🛠️ Patching users table...');
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        `);
        console.log('✅ Users table patched');

    } catch (error) {
        console.error('❌ Database patch failed:', error);
    } finally {
        await pool.end();
    }
}

patchDatabase();
