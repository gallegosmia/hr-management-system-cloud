const { Pool } = require('pg');

const pool = new Pool({
    // Using the forced correct connection string
    connectionString: "postgresql://postgres.kxwevzvztrdcksuvkwqf:HR-System-Cloud-2026!@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
    ssl: { rejectUnauthorized: false }
});

async function fixDatabase() {
    try {
        console.log('🔌 Connecting to database...');

        // 1. Create Sessions Table
        console.log('🛠️ Creating sessions table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Sessions table created/verified');

        // 2. Create Audit Logs Table (also needed for some actions)
        console.log('🛠️ Creating audit_logs table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                action TEXT NOT NULL,
                details JSONB,
                ip_address VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Audit Logs table created/verified');

        // 3. Verify Tables exist
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('📊 Current tables:', res.rows.map(r => r.table_name).join(', '));

    } catch (error) {
        console.error('❌ Database fix failed:', error);
    } finally {
        await pool.end();
    }
}

fixDatabase();
