const { Pool } = require('pg');
const fs = require('fs');

// Database configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/hr_system'
});

async function createUserNotificationsTable() {
    const client = await pool.connect();

    try {
        console.log('🔧 Creating user_notifications table...');

        // Create the table
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'system',
                severity VARCHAR(20) DEFAULT 'medium',
                link VARCHAR(500),
                reference_id VARCHAR(100),
                is_read BOOLEAN DEFAULT FALSE,
                read_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        console.log('✅ Table created successfully');

        // Create indexes for performance
        console.log('🔧 Creating indexes...');

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id 
            ON user_notifications(user_id);
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read 
            ON user_notifications(is_read);
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at 
            ON user_notifications(created_at DESC);
        `);

        console.log('✅ Indexes created successfully');

        // Verify table structure
        const result = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'user_notifications'
            ORDER BY ordinal_position;
        `);

        console.log('\n📋 Table structure:');
        console.table(result.rows);

        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration
createUserNotificationsTable()
    .then(() => {
        console.log('\n🎉 All done!');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n💥 Fatal error:', err);
        process.exit(1);
    });
